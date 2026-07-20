# Architecture

## Overview

Recipe Manager is an Nx monorepo implementing a serverless full-stack application on AWS. Users can create, read, update, and delete personal recipes through a single-page Angular frontend backed by a REST API.

## System Diagram

```
                 +-------------------+
                 |     CloudFront    |
                 | (HTTPS, OAC, SPA)|
                 +--------+----------+
                          |
              +-----------+-----------+
              |                       |
     +--------v--------+    +--------v--------+
     |   S3 Bucket     |    |  API Gateway    |
     | (Angular SPA)   |    | (REST, /prod)   |
     | KMS-encrypted   |    | CORS enabled    |
     +-----------------+    +--------+--------+
                                     |
                            +--------v--------+
                            | Cognito         |
                            | Authorizer      |
                            +--------+--------+
                                     |
                            +--------v--------+
                            | Lambda Function |
                            | (Node.js 20.x) |
                            +--------+--------+
                                     |
                            +--------v--------+
                            |   DynamoDB      |
                            | (PAY_PER_REQUEST|
                            |  KMS-encrypted) |
                            +-----------------+

     +-------------------+
     |   KMS Key         |
     | (shared, rotated) |
     +-------------------+
         encrypts S3 + DynamoDB

     +-------------------+
     | Cognito User Pool |
     | (email sign-in)   |
     +-------------------+
```

## Monorepo Structure

This is an Nx 22.7.3 workspace managed with pnpm.

| Path           | Purpose                                |
| -------------- | -------------------------------------- |
| `apps/api/`    | Lambda handler for CRUD operations     |
| `apps/infra/`  | CDK infrastructure-as-code             |
| `apps/web/`    | Angular 21 single-page application     |
| `libs/shared/` | Shared TypeScript interfaces and types |

Cross-project references use the `@recipe-manager/shared` path alias defined in `tsconfig.base.json`.

## Serverless API

- **API Gateway**: REST API (`RestApi`) with CORS configured for all origins, deployed to the `prod` stage.
- **Lambda**: Single `NodejsFunction` handler bundled with esbuild (CJS format, minified, source maps). Handles all routes via path and method matching inside the handler.
- **DynamoDB**: Single table (`RecipesTable`) with composite key (`userId` PK + `id` SK). Pay-per-request billing mode with point-in-time recovery.
- **Routes**: `GET /recipes`, `POST /recipes`, `GET /recipes/{id}`, `PUT /recipes/{id}`, `DELETE /recipes/{id}`.

## Frontend Hosting

- **S3**: Private bucket with `BlockPublicAccess.BLOCK_ALL`. All access goes through CloudFront.
- **CloudFront**: Distribution with Origin Access Control (OAC) to the S3 bucket. HTTP/2 enabled. SPA routing handled via custom error responses (403/404 return `/index.html` with 200 status).
- **HTTPS**: Viewer protocol policy redirects HTTP to HTTPS.

## Authentication Flow

1. User signs up via the Angular app, which calls Cognito using `amazon-cognito-identity-js`.
2. Email confirmation completes registration.
3. On sign-in, Cognito returns an ID token stored client-side.
4. The Angular `authInterceptor` attaches the ID token as a `Bearer` token in the `Authorization` header for API requests.
5. API Gateway validates the token via a `CognitoUserPoolsAuthorizer`.
6. Lambda extracts `event.requestContext.authorizer.claims.sub` as the `userId`.

## Encryption

A single KMS key (`EncryptionKey`) with automatic rotation encrypts:

- DynamoDB table data (customer-managed encryption)
- S3 frontend bucket (KMS bucket encryption)

## Key Decisions

- **Single Lambda**: All API routes in one handler for simplicity and reduced cold starts. Path-based routing is internal.
- **Single table design**: Recipes are partitioned by `userId` to enforce data isolation at the DynamoDB level.
- **No custom domain**: CloudFront and API Gateway use AWS-generated domains. Custom domains can be added later.
- **ID token for auth**: The Cognito ID token (not access token) is used so the Lambda can read user claims directly.
