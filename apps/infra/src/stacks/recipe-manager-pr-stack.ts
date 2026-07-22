import * as path from 'node:path';

import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import {
  AllowedMethods,
  Distribution,
  HttpVersion,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
  TableEncryption,
} from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export interface RecipeManagerPrStackProps extends StackProps {
  /**
   * The PR number, used for labelling resources and the frontend banner.
   */
  prNumber: string;

  /**
   * The full GitHub PR URL shown in the frontend banner.
   * e.g. https://github.com/owner/repo/pull/42
   */
  prUrl: string;

  /**
   * Cognito User Pool ID imported from the main RecipeManagerStack.
   * Lets PR deployments share the same user accounts so no re-registration is needed.
   */
  mainUserPoolId: string;

  /**
   * Cognito User Pool Client ID imported from the main RecipeManagerStack.
   */
  mainUserPoolClientId: string;
}

/**
 * Ephemeral stack for pull-request preview deployments.
 *
 * Key differences from RecipeManagerStack:
 *  - Reuses the Cognito User Pool / Client from the main stack (no new sign-ups needed).
 *  - Injects prNumber + prUrl into config.json so the Angular app shows a test-deployment banner.
 *  - All storage resources are created with DESTROY removal policies (they are throwaway).
 */
export class RecipeManagerPrStack extends Stack {
  constructor(scope: Construct, id: string, props: RecipeManagerPrStackProps) {
    super(scope, id, props);

    const { prNumber, prUrl, mainUserPoolId, mainUserPoolClientId } = props;

    // ── Encryption key (ephemeral; DESTROY on stack delete) ──────────────────
    const encryptionKey = new Key(this, 'EncryptionKey', {
      description: `KMS key for Recipe Manager PR #${prNumber}`,
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // ── DynamoDB – separate table per PR so data is isolated ─────────────────
    const recipesTable = new Table(this, 'RecipesTable', {
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: false,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    recipesTable.addGlobalSecondaryIndex({
      indexName: 'byCategory',
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // ── Import the shared Cognito User Pool from the main stack ───────────────
    const userPool = UserPool.fromUserPoolId(this, 'SharedUserPool', mainUserPoolId);

    // Create a dedicated app client for this PR stack so it can be cleaned up
    // independently.  The main client continues to work for the production stack.
    const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // ── S3 + CloudFront for frontend ──────────────────────────────────────────
    const frontendBucket = new Bucket(this, 'FrontendBucket', {
      encryption: BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distribution = new Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      },
      defaultRootObject: 'index.html',
      httpVersion: HttpVersion.HTTP2,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5),
        },
      ],
    });

    // ── Lambda API handler ────────────────────────────────────────────────────
    const apiHandler = new NodejsFunction(this, 'RecipeApiHandler', {
      entry: path.join(__dirname, '../../../api/src/handler.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(60),
      environment: {
        TABLE_NAME: recipesTable.tableName,
      },
      bundling: {
        format: OutputFormat.CJS,
        minify: true,
        sourceMap: true,
      },
    });

    recipesTable.grantReadWriteData(apiHandler);

    apiHandler.addToRolePolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          'arn:aws:bedrock:*:*:inference-profile/eu.amazon.nova-lite-v1:0',
          'arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0',
        ],
      }),
    );

    // ── API Gateway ───────────────────────────────────────────────────────────
    const cognitoAuthorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const api = new RestApi(this, 'RecipeApi', {
      restApiName: `recipe-manager-api-pr-${prNumber}`,
      description: `HTTP API for Recipe Manager PR #${prNumber}`,
      defaultCorsPreflightOptions: {
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowMethods: Cors.ALL_METHODS,
        allowOrigins: Cors.ALL_ORIGINS,
      },
      deployOptions: {
        stageName: 'prod',
      },
    });

    const lambdaIntegration = new LambdaIntegration(apiHandler);

    const methodOptions = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: cognitoAuthorizer,
    };

    api.root.addMethod('GET', lambdaIntegration, methodOptions);

    const recipes = api.root.addResource('recipes');
    recipes.addMethod('GET', lambdaIntegration, methodOptions);
    recipes.addMethod('POST', lambdaIntegration, methodOptions);

    const importResource = recipes.addResource('import');
    importResource.addMethod('POST', lambdaIntegration, methodOptions);

    const recipe = recipes.addResource('{id}');
    recipe.addMethod('GET', lambdaIntegration, methodOptions);
    recipe.addMethod('PUT', lambdaIntegration, methodOptions);
    recipe.addMethod('DELETE', lambdaIntegration, methodOptions);

    // ── Frontend Deployment ───────────────────────────────────────────────────
    // config.json includes prNumber + prUrl so the Angular app renders the banner.
    // The userPoolClientId is set to the PR-specific client created above.
    new BucketDeployment(this, 'FrontendDeployment', {
      sources: [
        Source.asset(path.join(__dirname, '../../../../dist/apps/web/browser')),
        Source.jsonData('config.json', {
          apiUrl: api.url,
          userPoolId: mainUserPoolId,
          userPoolClientId: userPoolClient.userPoolClientId,
          region: Stack.of(this).region,
          prNumber,
          prUrl,
        }),
      ],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // ── Outputs ───────────────────────────────────────────────────────────────
    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Recipe Manager PR API URL',
    });

    new CfnOutput(this, 'CloudFrontDomain', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID (shared from main stack)',
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID (PR-specific)',
    });

    new CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket name for PR frontend hosting',
    });

    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });
  }
}
