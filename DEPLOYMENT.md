# Deployment

This document describes the deployment pipeline and its prerequisites for the Recipe Manager application.

## Overview

The deployment is automated via a GitHub Actions workflow (`.github/workflows/deploy.yml`) that triggers on every push to the `main` branch. The workflow performs the following steps:

1. Builds all applications using Nx
2. Assumes the AWS IAM role `RecipeManagerGitHubDeployRole` via OIDC federation
3. Deploys the CDK stack (`RecipeManagerStack`) to AWS
4. Retrieves CDK stack outputs (S3 bucket name and CloudFront distribution ID) via `aws cloudformation describe-stacks`
5. Syncs the Angular frontend build to the S3 bucket
6. Invalidates the CloudFront distribution cache

## Prerequisites

### GitHub Repository Secrets and Variables

The workflow uses GitHub OIDC to authenticate with AWS. The repository must be configured with the following:

- **OIDC trust relationship**: The AWS IAM role must trust the GitHub OIDC provider for this repository.

### IAM Role: `RecipeManagerGitHubDeployRole`

The GitHub Actions workflow assumes the IAM role `arn:aws:iam::352770552266:role/RecipeManagerGitHubDeployRole` via OIDC. This role must have an identity-based policy that grants the following permissions:

#### Required IAM Permissions

| Permission | Resource | Purpose |
|---|---|---|
| `sts:AssumeRoleWithWebIdentity` | (trust policy) | Allow GitHub Actions to assume the role via OIDC |
| `cloudformation:*` | `arn:aws:cloudformation:eu-west-1:352770552266:stack/RecipeManagerStack/*` | CDK deploy and stack management |
| `cloudformation:DescribeStacks` | `arn:aws:cloudformation:eu-west-1:352770552266:stack/RecipeManagerStack/*` | Retrieve stack outputs (bucket name, distribution ID) after deployment |
| `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` | Frontend S3 bucket | Sync frontend build artifacts |
| `cloudfront:CreateInvalidation` | CloudFront distribution | Invalidate CDN cache after frontend deploy |
| CDK bootstrap permissions | Various | CDK requires permissions to manage its staging bucket, Lambda functions, API Gateway, IAM roles, etc. |

> **Note**: The `cloudformation:DescribeStacks` permission is critical. After CDK deploys the stack, the workflow calls `aws cloudformation describe-stacks` to read the stack outputs (`FrontendBucketName` and `CloudFrontDistributionId`). These output values are dynamically used in subsequent steps to deploy the frontend to the correct S3 bucket and invalidate the correct CloudFront distribution. Without this permission, the deployment will fail with an `AccessDenied` error.

#### Minimum Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CDKDeployAndDescribe",
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:GetTemplate",
        "cloudformation:CreateChangeSet",
        "cloudformation:ExecuteChangeSet",
        "cloudformation:DeleteChangeSet",
        "cloudformation:DescribeChangeSet"
      ],
      "Resource": "arn:aws:cloudformation:eu-west-1:352770552266:stack/RecipeManagerStack/*"
    },
    {
      "Sid": "S3FrontendSync",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::FRONTEND_BUCKET_NAME",
        "arn:aws:s3:::FRONTEND_BUCKET_NAME/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::352770552266:distribution/DISTRIBUTION_ID"
    }
  ]
}
```

Replace `FRONTEND_BUCKET_NAME` and `DISTRIBUTION_ID` with the actual resource identifiers from your CDK stack outputs.

> **Important**: CDK itself may require additional permissions depending on the resources defined in the stack (e.g., IAM, Lambda, API Gateway, S3, CloudFront, SSM). Consult the [AWS CDK documentation on IAM permissions](https://docs.aws.amazon.com/cdk/v2/guide/security-iam.html) for a full list.

## Troubleshooting

### `AccessDenied` on `DescribeStacks`

If you see an error like:

```
User: arn:aws:sts::352770552266:assumed-role/RecipeManagerGitHubDeployRole/GitHubActions
is not authorized to perform: cloudformation:DescribeStacks on resource:
arn:aws:cloudformation:eu-west-1:352770552266:stack/RecipeManagerStack/...
```

This means the IAM role `RecipeManagerGitHubDeployRole` is missing the `cloudformation:DescribeStacks` permission. Add it to the role's identity-based policy as shown above.

### CDK Bootstrap

Before the first deployment, ensure the target AWS account and region have been bootstrapped:

```bash
pnpm cdk bootstrap aws://352770552266/eu-west-1
```

The role must also have permissions to access the CDK bootstrap resources (staging bucket, ECR repository if applicable).
