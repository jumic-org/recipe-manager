# Coding Conventions

## TypeScript

- **Strict mode** is enabled globally via `tsconfig.base.json` with additional flags: `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`.
- Target: `ES2022`.
- Use bracket notation with string literals for index-signature property access (required by `noPropertyAccessFromIndexSignature`).
- Prefer explicit types for function parameters and return values.

## Shared Types (libs/shared)

All data model interfaces and DTOs live in `libs/shared/src/index.ts` and are imported via the `@recipe-manager/shared` path alias.

When adding a new domain concept:

1. Define the interface in `libs/shared/src/index.ts`.
2. Export it from the barrel.
3. Use `Omit<>` to derive input types from full interfaces (see `CreateRecipeInput`, `UpdateRecipeInput`).

## Angular (apps/web)

### Components

- **Standalone components only** (no NgModules). Import dependencies directly in the component's `imports` array.
- **Change detection**: Always use `ChangeDetectionStrategy.OnPush`.
- **Selector prefix**: `rm-` (e.g., `rm-recipe-list`, `rm-login`).
- **Styles**: SCSS files co-located with components.
- **File naming**: `feature-name.component.ts`, `feature-name.component.scss`.

### Services

- Use `@Injectable({ providedIn: 'root' })` for singleton services.
- `RecipeService` in `apps/web/src/app/recipes/recipe.service.ts` - HTTP operations.
- `AuthService` in `apps/web/src/app/auth/auth.service.ts` - Cognito interactions.

### Routing

- Routes defined in `apps/web/src/app/app.routes.ts`.
- Protected routes use `canActivate: [authGuard]` (functional guard pattern).
- Auth pages (login, register, confirm) are unguarded.

### HTTP

- `provideHttpClient(withInterceptors([authInterceptor]))` in `app.config.ts`.
- The `authInterceptor` in `apps/web/src/app/auth/auth.interceptor.ts` attaches the Cognito ID token only for requests to the API URL.

### Environment Configuration

- `apps/web/src/environments/environment.ts` - development values.
- `apps/web/src/environments/environment.prod.ts` - production values.
- Properties: `production`, `apiUrl`, `userPoolId`, `userPoolClientId`, `region`.

## Lambda (apps/api)

### Handler Pattern

- Single file: `apps/api/src/handler.ts`.
- Export a named `handler` of type `APIGatewayProxyHandler`.
- Route matching via `event.path` and `event.httpMethod`.
- User identity from `event.requestContext.authorizer.claims.sub`.

### CORS

Standard CORS headers are returned on every response:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Origin': '*'
};
```

### DynamoDB Access

- Use `@aws-sdk/lib-dynamodb` (`DynamoDBDocumentClient`) for simplified attribute marshalling.
- Table name from `process.env['TABLE_NAME']`.
- Always scope queries with the `userId` partition key for tenant isolation.

### Error Handling

- Wrap the entire handler in a try/catch.
- Return structured JSON error bodies: `{ message: string }`.
- Use `ConditionExpression: 'attribute_exists(userId) AND attribute_exists(id)'` for update/delete to ensure the item exists.

### Response Helper

```typescript
function response(statusCode: number, body?: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: body === undefined ? '' : JSON.stringify(body)
  };
}
```

## CDK (apps/infra)

### Structure

- Entry point: `apps/infra/src/main.ts` creates the CDK `App` and instantiates stacks.
- Stacks: `apps/infra/src/stacks/recipe-manager-stack.ts` - all resources in a single stack.
- CDK config: `cdk.json` at the repo root.

### Patterns

- Use `NodejsFunction` with the `entry` property pointing directly to the Lambda source file. CDK handles bundling via esbuild.
- Use `RemovalPolicy.DESTROY` for all resources (suitable for dev/staging; change for production).
- Pass resource names to Lambda via environment variables.
- Grant permissions using high-level methods (`table.grantReadWriteData(fn)`).
- Outputs (`CfnOutput`) expose API URL, CloudFront domain, User Pool ID, Client ID, and bucket name for deployment scripts.

### Naming

- Stack: `RecipeManagerStack`
- Construct IDs: PascalCase descriptive names (e.g., `RecipesTable`, `FrontendBucket`, `RecipeApiHandler`).

## Import/Export Conventions

- Use `import type { ... }` for type-only imports.
- Barrel exports from `libs/shared/src/index.ts`.
- Path aliases defined in `tsconfig.base.json`:
  ```json
  "@recipe-manager/shared": ["libs/shared/src/index.ts"]
  ```
