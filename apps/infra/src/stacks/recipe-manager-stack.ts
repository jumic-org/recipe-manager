import * as path from 'node:path';

import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps
} from 'aws-cdk-lib';
import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RestApi
} from 'aws-cdk-lib/aws-apigateway';
import {
  AllowedMethods,
  Distribution,
  HttpVersion,
  ViewerProtocolPolicy
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  AccountRecovery,
  UserPool,
  UserPoolClient
} from 'aws-cdk-lib/aws-cognito';
import {
  AttributeType,
  BillingMode,
  ProjectionType,
  Table,
  TableEncryption
} from 'aws-cdk-lib/aws-dynamodb';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption
} from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export class RecipeManagerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // KMS Key for encryption
    const encryptionKey = new Key(this, 'EncryptionKey', {
      description: 'KMS key for Recipe Manager encryption',
      enableKeyRotation: true,
      removalPolicy: RemovalPolicy.DESTROY
    });

    // DynamoDB Table
    const recipesTable = new Table(this, 'RecipesTable', {
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'id', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.CUSTOMER_MANAGED,
      encryptionKey,
      pointInTimeRecovery: true,
      removalPolicy: RemovalPolicy.DESTROY
    });

    recipesTable.addGlobalSecondaryIndex({
      indexName: 'byCategory',
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'createdAt', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL
    });

    // Cognito User Pool
    const userPool = new UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY
    });

    const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
      userPool,
      authFlows: {
        userPassword: true,
        userSrp: true
      }
    });

    // S3 Bucket for frontend hosting
    const frontendBucket = new Bucket(this, 'FrontendBucket', {
      encryption: BucketEncryption.KMS,
      encryptionKey,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // CloudFront Distribution with OAC
    const distribution = new Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS
      },
      defaultRootObject: 'index.html',
      httpVersion: HttpVersion.HTTP2,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5)
        }
      ]
    });

    // Frontend Deployment
    new BucketDeployment(this, 'FrontendDeployment', {
      sources: [
        Source.asset(
          path.join(__dirname, '../../../../dist/apps/web/browser')
        )
      ],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*']
    });

    // Lambda Function
    const apiHandler = new NodejsFunction(this, 'RecipeApiHandler', {
      entry: path.join(__dirname, '../../../api/src/handler.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(10),
      environment: {
        TABLE_NAME: recipesTable.tableName
      },
      bundling: {
        format: OutputFormat.CJS,
        minify: true,
        sourceMap: true
      }
    });

    recipesTable.grantReadWriteData(apiHandler);

    // API Gateway with Cognito Authorizer
    const cognitoAuthorizer = new CognitoUserPoolsAuthorizer(
      this,
      'CognitoAuthorizer',
      {
        cognitoUserPools: [userPool]
      }
    );

    const api = new RestApi(this, 'RecipeApi', {
      restApiName: 'recipe-manager-api',
      description: 'HTTP API for Recipe Manager',
      defaultCorsPreflightOptions: {
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowMethods: Cors.ALL_METHODS,
        allowOrigins: Cors.ALL_ORIGINS
      },
      deployOptions: {
        stageName: 'prod'
      }
    });

    const lambdaIntegration = new LambdaIntegration(apiHandler);

    const methodOptions = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: cognitoAuthorizer
    };

    // Root resource
    api.root.addMethod('GET', lambdaIntegration, methodOptions);

    // /recipes resource
    const recipes = api.root.addResource('recipes');
    recipes.addMethod('GET', lambdaIntegration, methodOptions);
    recipes.addMethod('POST', lambdaIntegration, methodOptions);

    // /recipes/{id} resource
    const recipe = recipes.addResource('{id}');
    recipe.addMethod('GET', lambdaIntegration, methodOptions);
    recipe.addMethod('PUT', lambdaIntegration, methodOptions);
    recipe.addMethod('DELETE', lambdaIntegration, methodOptions);

    // Outputs
    new CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Recipe Manager API URL'
    });

    new CfnOutput(this, 'CloudFrontDomain', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name'
    });

    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID'
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID'
    });

    new CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket name for frontend hosting'
    });

    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID'
    });
  }
}
