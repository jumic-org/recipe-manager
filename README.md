# Recipe Manager

A private app for a family to keep their recipes in one place. See [GLOSSARY.md](GLOSSARY.md) for the vocabulary and [docs/adr](docs/adr) for the decisions behind the structure.

The repo is one pnpm workspace:

| Package     | Contents                                               |
| ----------- | ------------------------------------------------------ |
| `shared/`   | Types shared by frontend and backend, such as `Recipe` |
| `backend/`  | Lambda functions behind API Gateway, and their tests   |
| `frontend/` | Angular single-page app                                |
| `infra/`    | AWS CDK stack that deploys everything                  |

Everything runs in one stack in `eu-central-1` (Frankfurt). There is no separate test environment.

## Prerequisites

- Node.js 22 or newer and pnpm 12
- Java 17 or newer, for DynamoDB Local in the backend tests
- AWS credentials for the target account in your shell (for example `AWS_PROFILE`)

```sh
pnpm install
```

## Deploy

Once per account and region, prepare the account for CDK:

```sh
pnpm --filter infra exec cdk bootstrap
```

Then build and deploy the whole stack with one command:

```sh
pnpm run deploy
```

Use `pnpm run deploy`, not `pnpm deploy`: the latter is a different built-in pnpm command.

The command builds the Angular app, then deploys the stack. CDK asks for confirmation before it applies IAM changes. When it finishes it prints:

- `SiteUrl`: the address of the app (a generated CloudFront address)
- `ApiUrl`: the API address
- `UserPoolId`: the Cognito user pool that holds the Users

Nobody can register. Create the first User by following [docs/operations/users.md](docs/operations/users.md).

Running the same command again updates the deployed app. To remove the stack, run `pnpm --filter infra run destroy`. The DynamoDB table and the user pool are kept when the stack is deleted, so no data is lost by accident.

## Develop

```sh
pnpm typecheck     # all packages
pnpm test          # backend tests
pnpm lint          # ESLint (use lint:fix to fix what it can)
pnpm format        # Prettier (use format:check to only check)
```

A pre-commit hook (husky and lint-staged) lints and formats the staged files.

The backend tests call the Lambda handler the way API Gateway does and run against DynamoDB Local. On the first run, the DynamoDB Local jar is downloaded to the system temp directory.

To run the app locally against the deployed stack, copy `frontend/config.example.json` to `frontend/public/config.json` and fill in the values of your deployment (the file is git-ignored), then:

```sh
pnpm --filter frontend start
```

The app is served at `http://localhost:4200`, which the Cognito app client already accepts as a sign-in address.

## Contribute

Nobody can push to `main`. Open a pull request instead:

- The PR title must follow [Conventional Commits](https://www.conventionalcommits.org/), for example `feat: add recipe search`. The PR is squash-merged and the title becomes the commit message.
- CI must pass: `lint`, `typecheck`, `test` and `build`. The merge queue runs the same checks again before it merges.
- Dependabot opens weekly update PRs. Patch and minor updates merge themselves once CI is green. Major updates wait for a manual review.
