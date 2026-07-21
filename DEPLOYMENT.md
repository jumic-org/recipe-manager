# Deployment

This document describes the deployment pipeline and its prerequisites for the Recipe Manager application.

## Overview

The deployment is automated via a GitHub Actions workflow (`.github/workflows/deploy.yml`) that triggers on every push to the `main` branch. The workflow performs the following steps:

1. Builds all applications using Nx
2. Assumes the AWS IAM role `RecipeManagerGitHubDeployRole` via OIDC federation
3. Deploys the CDK stack (`RecipeManagerStack`) to AWS

The CDK stack uses `BucketDeployment` to handle syncing the Angular frontend build to S3 and invalidating the CloudFront distribution cache automatically as part of the CDK deploy step.

## Prerequisites

### GitHub Repository Secrets and Variables

The workflow uses GitHub OIDC to authenticate with AWS. The repository must be configured with the following:

- **OIDC trust relationship**: The AWS IAM role must trust the GitHub OIDC provider for this repository.

### IAM Role: `RecipeManagerGitHubDeployRole`

The GitHub Actions workflow assumes the IAM role `arn:aws:iam::352770552266:role/RecipeManagerGitHubDeployRole` via OIDC. This role must have an identity-based policy that grants the following permissions:

#### Required IAM Permissions

| Permission                      | Resource                                                                   | Purpose                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `sts:AssumeRoleWithWebIdentity` | (trust policy)                                                             | Allow GitHub Actions to assume the role via OIDC                                                                      |
| `cloudformation:*`              | `arn:aws:cloudformation:eu-west-1:352770552266:stack/RecipeManagerStack/*` | CDK deploy and stack management                                                                                       |
| CDK bootstrap permissions       | Various                                                                    | CDK requires permissions to manage its staging bucket, Lambda functions, API Gateway, IAM roles, S3, CloudFront, etc. |

> **Note**: The CDK `BucketDeployment` construct handles S3 syncing and CloudFront cache invalidation internally using a custom resource Lambda. The necessary S3 and CloudFront permissions are managed by CDK through the roles it creates for this custom resource, so they do not need to be granted directly to the GitHub Actions role.

#### Minimum Policy Example

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CDKDeploy",
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
    }
  ]
}
```

> **Important**: CDK itself may require additional permissions depending on the resources defined in the stack (e.g., IAM, Lambda, API Gateway, S3, CloudFront, SSM). The `BucketDeployment` construct creates a custom resource Lambda that needs S3 and CloudFront permissions, but these are granted by CDK to the Lambda execution role automatically. Consult the [AWS CDK documentation on IAM permissions](https://docs.aws.amazon.com/cdk/v2/guide/security-iam.html) for a full list.

## Troubleshooting

### CDK Deploy Fails

If CDK deploy fails, check the CloudFormation events in the AWS Console for the `RecipeManagerStack` stack. Common issues include:

- Missing permissions for the GitHub Actions role to create/update CloudFormation resources
- CDK bootstrap resources not available in the target account/region

### CDK Bootstrap

Before the first deployment, ensure the target AWS account and region have been bootstrapped:

```bash
pnpm cdk bootstrap aws://352770552266/eu-west-1
```

The role must also have permissions to access the CDK bootstrap resources (staging bucket, ECR repository if applicable).
