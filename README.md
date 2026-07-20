# Recipe Manager

Cloud-based recipe manager scaffolded as an Nx monorepo.

## Stack

- Angular frontend in `apps/web`
- AWS CDK app in `apps/infra`
- TypeScript Lambda handler in `apps/api`
- pnpm workspace with Nx project orchestration

## Getting Started

```bash
corepack enable
pnpm install
pnpm nx serve web
```

## Build

```bash
pnpm nx build web
pnpm nx build api
pnpm nx synth infra
```

## Deploy Cloud Resources

Configure AWS credentials first, then bootstrap and deploy CDK:

```bash
pnpm cdk bootstrap
pnpm nx deploy infra
```

The CDK stack deploys an API Gateway REST API backed by the Lambda handler in `apps/api/src/handler.ts`.

## CI/CD Deployment

The project uses a GitHub Actions workflow to automatically deploy on pushes to `main`. See [DEPLOYMENT.md](./DEPLOYMENT.md) for full details on the deployment pipeline, IAM prerequisites, and required permissions.
