import * as path from "node:path";
import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";
import { PASSWORD_POLICY } from "@recipe-manager/shared";

const repoRoot = path.join(import.meta.dirname, "..", "..");
const LOCAL_DEV_ORIGIN = "http://localhost:4200";

export class RecipeManagerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Data. Point-in-time recovery makes a mistaken delete recoverable.
    const table = new dynamodb.TableV2(this, "Table", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Web app: private bucket behind CloudFront.
    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      // Single-page app: unknown paths are routed by Angular.
      errorResponses: [403, 404].map((httpStatus) => ({
        httpStatus,
        responseHttpStatus: 200,
        responsePagePath: "/index.html",
        ttl: Duration.seconds(0),
      })),
    });
    const siteUrl = `https://${distribution.distributionDomainName}`;

    // Sign-in. Users are created by hand in the console; nobody can register.
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: false,
      signInAliases: { username: true, email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: PASSWORD_POLICY,
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      featurePlan: cognito.FeaturePlan.ESSENTIALS,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    const userPoolDomain = userPool.addDomain("Domain", {
      cognitoDomain: { domainPrefix: `recipes-${this.account}` },
      managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
    });
    const userPoolClient = userPool.addClient("WebClient", {
      generateSecret: false,
      preventUserExistenceErrors: true,
      enableTokenRevocation: true,
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(30),
      oAuth: {
        flows: { authorizationCodeGrant: true },
        // COGNITO_ADMIN lets the app call ChangePassword with the access token.
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.COGNITO_ADMIN],
        callbackUrls: [`${siteUrl}/auth/callback`, `${LOCAL_DEV_ORIGIN}/auth/callback`],
        logoutUrls: [`${siteUrl}/`, `${LOCAL_DEV_ORIGIN}/`],
      },
    });
    // Without branding, the new Managed Login page does not render. Use Cognito's defaults.
    new cognito.CfnManagedLoginBranding(this, "ManagedLoginBranding", {
      userPoolId: userPool.userPoolId,
      clientId: userPoolClient.userPoolClientId,
      useCognitoProvidedValues: true,
    }).node.addDependency(userPoolDomain);

    // API. Every route requires a signed-in User.
    const apiFunction = new nodejs.NodejsFunction(this, "ApiFunction", {
      entry: path.join(repoRoot, "backend", "src", "api.ts"),
      handler: "handler",
      projectRoot: repoRoot,
      depsLockFilePath: path.join(repoRoot, "pnpm-lock.yaml"),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(10),
      environment: { TABLE_NAME: table.tableName },
      bundling: { minify: true, sourceMap: true, externalModules: [] },
    });
    table.grantReadWriteData(apiFunction);

    const api = new apigw.HttpApi(this, "Api", {
      defaultAuthorizer: new HttpUserPoolAuthorizer("Authorizer", userPool, {
        userPoolClients: [userPoolClient],
      }),
      corsPreflight: {
        allowOrigins: [siteUrl, LOCAL_DEV_ORIGIN],
        allowMethods: [apigw.CorsHttpMethod.ANY],
        allowHeaders: ["authorization", "content-type"],
        maxAge: Duration.hours(1),
      },
    });
    api.addRoutes({
      path: "/recipes",
      methods: [apigw.HttpMethod.GET],
      integration: new HttpLambdaIntegration("ApiIntegration", apiFunction),
    });

    // Publish the built app together with the values it needs at runtime.
    new s3deploy.BucketDeployment(this, "SiteDeployment", {
      destinationBucket: siteBucket,
      sources: [
        s3deploy.Source.asset(path.join(repoRoot, "frontend", "dist", "frontend", "browser")),
        s3deploy.Source.jsonData("config.json", {
          apiUrl: api.apiEndpoint,
          cognito: {
            region: this.region,
            userPoolId: userPool.userPoolId,
            clientId: userPoolClient.userPoolClientId,
            domain: userPoolDomain.baseUrl(),
          },
        }),
      ],
      distribution,
      distributionPaths: ["/*"],
    });

    new CfnOutput(this, "SiteUrl", { value: siteUrl });
    new CfnOutput(this, "ApiUrl", { value: api.apiEndpoint });
    new CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
  }
}
