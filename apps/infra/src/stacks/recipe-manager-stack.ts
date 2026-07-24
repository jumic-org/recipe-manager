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
import { AccountRecovery, UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
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

export interface RecipeManagerStackProps extends StackProps {
  /**
   * Optional PR number. When provided, the stack operates in PR preview mode.
   */
  prNumber?: string;

  /**
   * The full GitHub PR URL shown in the frontend banner.
   * e.g. https://github.com/owner/repo/pull/42
   */
  prUrl?: string;

  /**
   * Cognito User Pool ID imported from the main stack.
   * When provided, the stack reuses an existing User Pool instead of creating one.
   */
  mainUserPoolId?: string;

  /**
   * Cognito User Pool Client ID imported from the main stack.
   * Used for reference; a new client is created for the PR deployment.
   */
  mainUserPoolClientId?: string;
}

export class RecipeManagerStack extends Stack {
  constructor(scope: Construct, id: string, props?: RecipeManagerStackProps) {
    super(scope, id, props);

    const isPrDeployment = !!(props?.prNumber && props?.prUrl && props?.mainUserPoolId);

    // KMS Key for encryption
    const encryptionKey = new Key(this, 'EncryptionKey', {
      description: isPrDeployment
        ? `KMS key for Recipe Manager PR #${props.prNumber}`
        : 'KMS key for Recipe Manager encryption',
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // DynamoDB Table
    const recipesTable = new Table(this, 'RecipesTable', {
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: !isPrDeployment,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    recipesTable.addGlobalSecondaryIndex({
      indexName: 'byCategory',
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    // Cognito User Pool - either create new or import existing
    let userPool: import('aws-cdk-lib/aws-cognito').IUserPool;
    let userPoolClient: UserPoolClient;

    if (isPrDeployment) {
      // Import the shared User Pool from the main stack
      userPool = UserPool.fromUserPoolId(this, 'SharedUserPool', props.mainUserPoolId!);

      // Create a dedicated app client for this PR stack
      userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
        userPool,
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
      });
    } else {
      // Create a new User Pool for production
      const createdUserPool = new UserPool(this, 'UserPool', {
        selfSignUpEnabled: true,
        signInAliases: { email: true },
        passwordPolicy: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireDigits: true,
          requireSymbols: true,
        },
        accountRecovery: AccountRecovery.EMAIL_ONLY,
        removalPolicy: RemovalPolicy.DESTROY,
      });

      userPool = createdUserPool;
      userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
        userPool: createdUserPool,
        authFlows: {
          userPassword: true,
          userSrp: true,
        },
      });
    }

    // S3 Bucket for frontend hosting
    const frontendBucket = new Bucket(this, 'FrontendBucket', {
      encryption: BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Distribution with OAC
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

    // Lambda Function
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

    // Grant Bedrock InvokeModel permission
    // Cross-region inference profiles require permission on both the inference profile
    // itself and the underlying foundation model that requests are routed to.
    apiHandler.addToRolePolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: [
          'arn:aws:bedrock:*:*:inference-profile/eu.amazon.nova-lite-v1:0',
          'arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0',
        ],
      })
    );

    // API Gateway with Cognito Authorizer
    const cognitoAuthorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
    });

    const api = new RestApi(this, 'RecipeApi', {
      restApiName: isPrDeployment
        ? `recipe-manager-api-pr-${props.prNumber}`
        : 'recipe-manager-api',
      description: isPrDeployment
        ? `HTTP API for Recipe Manager PR #${props.prNumber}`
        : 'HTTP API for Recipe Manager',
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

    // Root resource
    api.root.addMethod('GET', lambdaIntegration, methodOptions);

    // /recipes resource
    const recipes = api.root.addResource('recipes');
    recipes.addMethod('GET', lambdaIntegration, methodOptions);
    recipes.addMethod('POST', lambdaIntegration, methodOptions);

    // /recipes/import resource
    const importResource = recipes.addResource('import');
    importResource.addMethod('POST', lambdaIntegration, methodOptions);

    // /recipes/import-text resource
    const importTextResource = recipes.addResource('import-text');
    importTextResource.addMethod('POST', lambdaIntegration, methodOptions);

    // /recipes/{id} resource
    const recipe = recipes.addResource('{id}');
    recipe.addMethod('GET', lambdaIntegration, methodOptions);
    recipe.addMethod('PUT', lambdaIntegration, methodOptions);
    recipe.addMethod('DELETE', lambdaIntegration, methodOptions);

    // Frontend Deployment - deploys Angular build files AND runtime config.json
    // config.json is generated with real Cognito/API values resolved at deploy time.
    // Both sources are combined in a single BucketDeployment to ensure config.json
    // is always deployed atomically with the frontend, eliminating any race conditions.
    const configJson: Record<string, string> = {
      apiUrl: api.url,
      userPoolId: userPool.userPoolId,
      userPoolClientId: userPoolClient.userPoolClientId,
      region: Stack.of(this).region,
    };

    if (isPrDeployment) {
      configJson['prNumber'] = props.prNumber!;
      configJson['prUrl'] = props.prUrl!;
    }

    new BucketDeployment(this, 'FrontendDeployment', {
      sources: [
        Source.asset(path.join(__dirname, '../../../../dist/apps/web/browser')),
        Source.jsonData('config.json', configJson),
      ],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Outputs
    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: isPrDeployment ? 'Recipe Manager PR API URL' : 'Recipe Manager API URL',
    });

    new CfnOutput(this, 'CloudFrontDomain', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: isPrDeployment
        ? 'Cognito User Pool ID (shared from main stack)'
        : 'Cognito User Pool ID',
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: isPrDeployment
        ? 'Cognito User Pool Client ID (PR-specific)'
        : 'Cognito User Pool Client ID',
    });

    new CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: isPrDeployment
        ? 'S3 bucket name for PR frontend hosting'
        : 'S3 bucket name for frontend hosting',
    });

    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });
  }
}
