# One pnpm monorepo for frontend, backend and infrastructure

The repo holds `frontend/` (Angular), `backend/` (Lambda functions) and `infra/` (AWS CDK) as pnpm workspace packages, plus a small `shared/` package for types used by both frontend and backend, all in TypeScript. This keeps shared types, such as the Recipe shape between API and UI, in one place and lets a single command build every package. The alternative was separate repos per part, which would need versioned shared packages for a two-person project. We chose pnpm over npm workspaces for its workspace support.
