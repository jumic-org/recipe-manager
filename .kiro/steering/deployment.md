# Deployment

## Prerequisites

- **Node.js** >= 24.x
- **pnpm** >= 10.x (enable via `corepack enable`)
- **AWS CLI** configured with credentials for the target account
- **AWS CDK CLI** (installed as a dev dependency, use via `pnpm cdk`)

## Install Dependencies

```bash
corepack enable
pnpm install
```

## Build Commands

Build all applications:
```bash
pnpm nx run-many -t build
```

Build individual apps:
```bash
pnpm nx build api    # Lambda handler
pnpm nx build web    # Angular frontend
pnpm nx build infra  # CDK infrastructure (compile check)
```

## CDK Deployment

### First-Time Setup (Bootstrap)

Bootstrap CDK in your target AWS account and region:
```bash
pnpm cdk bootstrap aws://ACCOUNT_ID/REGION
```

### Synthesize CloudFormation

Validate the infrastructure definition without deploying:
```bash
pnpm cdk synth
```

This produces a CloudFormation template in `cdk.out/`.

### Deploy

```bash
pnpm cdk deploy
```

This deploys the `RecipeManagerStack` which creates all resources:
- DynamoDB table
- Lambda function (bundled from `apps/api/src/handler.ts`)
- API Gateway REST API
- Cognito User Pool and Client
- S3 bucket for frontend
- CloudFront distribution
- KMS encryption key

### Deployment Outputs

After deployment, CDK prints outputs:
- `ApiUrl` - The API Gateway endpoint URL
- `CloudFrontDomain` - The CloudFront distribution domain
- `UserPoolId` - Cognito User Pool ID
- `UserPoolClientId` - Cognito User Pool Client ID
- `FrontendBucketName` - S3 bucket for the Angular app

## Environment Configuration

After the first deploy, update the frontend environment files with the actual values from CDK outputs.

### Development (`apps/web/src/environments/environment.ts`)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',  // or the deployed API URL for remote dev
  userPoolId: 'us-east-1_XXXXXXXXX',
  userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
  region: 'us-east-1'
};
```

### Production (`apps/web/src/environments/environment.prod.ts`)

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://XXXXXXXXXX.execute-api.us-east-1.amazonaws.com/prod',
  userPoolId: 'us-east-1_XXXXXXXXX',
  userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
  region: 'us-east-1'
};
```

Replace the placeholder values with actual CDK output values.

## Frontend Deployment

After building the Angular app, upload it to the S3 bucket:

```bash
# Build production frontend
pnpm nx build web

# Sync to S3
aws s3 sync dist/apps/web/browser s3://BUCKET_NAME --delete
```

### CloudFront Invalidation

After uploading new frontend assets, invalidate the CloudFront cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

To find the distribution ID:
```bash
aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[?Id=='BUCKET_NAME']].Id" \
  --output text
```

Or retrieve it from CDK outputs / CloudFormation console.

## CI/CD Considerations

A typical pipeline would:
1. Run `pnpm install` and `pnpm nx run-many -t build`.
2. Run `pnpm cdk synth` to validate infrastructure.
3. Run `pnpm cdk deploy --require-approval never` for automated deployment.
4. Run `aws s3 sync` for frontend upload.
5. Run CloudFront invalidation.

## Destroying the Stack

To tear down all resources:
```bash
pnpm cdk destroy
```

This removes all resources since `RemovalPolicy.DESTROY` is set. For production, change removal policies before deploying.
