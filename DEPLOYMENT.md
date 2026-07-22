# Deployment

This document describes the deployment pipeline and its prerequisites for the Recipe Manager application.

---

## Production Deployment

The production deployment is automated via `.github/workflows/deploy.yml` and triggers on every push to the `main` branch. The workflow performs the following steps:

1. Builds all applications using Nx
2. Assumes the AWS IAM role `RecipeManagerGitHubDeployRole` via OIDC federation
3. Deploys the CDK stack `RecipeManagerStack` to AWS (`eu-west-1`)

The CDK stack uses `BucketDeployment` to sync the Angular frontend build to S3 and invalidate the CloudFront distribution cache automatically.

---

## PR Preview Deployments

### Overview

Every push to a pull request triggers `.github/workflows/deploy-pr.yml`, which:

1. Builds the application
2. Reads the `UserPoolId` and `UserPoolClientId` outputs from the main `RecipeManagerStack` so the preview shares the same Cognito user pool (no new sign-up required)
3. Deploys an ephemeral CDK stack named `RecipeManagerStack_PR_<number>` using the `RecipeManagerPrStack` construct
4. Posts (or updates) a PR comment with the CloudFront preview URL

The preview frontend displays a **yellow test-deployment banner** linking back to the GitHub PR.

### Cognito sharing

The PR stack imports the Cognito User Pool from the main stack by ID and creates a **new App Client** for the preview.  Users who already have an account on the main stack can sign in to the PR preview immediately.  The preview's DynamoDB table is completely separate, so recipe data is isolated.

### Stack lifetime and cleanup

| Trigger | Action |
|---|---|
| PR closed or merged | `.github/workflows/cleanup-pr.yml` deletes the stack immediately |
| Stack untouched for **3 days** | The daily scheduled cleanup (cron `0 2 * * *`) deletes it |
| Manual | Run the `Cleanup PR Preview` workflow from the Actions tab with `workflow_dispatch` |

The 3-day safety net means the stack is always cleaned up even if the PR-closed event was missed (e.g. the workflow was disabled).

---

## Prerequisites

### IAM Role: `RecipeManagerGitHubDeployRole`

The workflow assumes `arn:aws:iam::352770552266:role/RecipeManagerGitHubDeployRole` via OIDC.

For PR deployments the same role is reused.  It additionally needs `cloudformation:*` permissions scoped to `arn:aws:cloudformation:eu-west-1:352770552266:stack/RecipeManagerStack_PR_*/*` so it can create, update and delete preview stacks.

#### Minimum policy addition for PR stacks

```json
{
  "Sid": "CDKDeployPRStacks",
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
    "cloudformation:DescribeChangeSet",
    "cloudformation:ListStacks"
  ],
  "Resource": [
    "arn:aws:cloudformation:eu-west-1:352770552266:stack/RecipeManagerStack_PR_*/*",
    "arn:aws:cloudformation:eu-west-1:352770552266:stack/RecipeManagerStack/*"
  ]
},
{
  "Sid": "ReadMainStackOutputs",
  "Effect": "Allow",
  "Action": "cloudformation:DescribeStacks",
  "Resource": "arn:aws:cloudformation:eu-west-1:352770552266:stack/RecipeManagerStack/*"
}
```

> `cloudformation:ListStacks` (without a resource condition) is required by the scheduled cleanup job to enumerate existing PR stacks.

### GitHub repository permissions

The deploy-pr workflow needs `pull-requests: write` to post the preview URL as a PR comment.

---

## Troubleshooting

### CDK Deploy Fails

Check the CloudFormation events in the AWS Console. Common issues:

- Missing permissions for the GitHub Actions role
- CDK bootstrap resources not available

### CDK Bootstrap

Before the first deployment, bootstrap CDK for the target account/region:

```bash
pnpm cdk bootstrap aws://352770552266/eu-west-1
```
