# Data Model

## DynamoDB Table Design

**Table name**: Determined at deploy time, passed to Lambda via `TABLE_NAME` environment variable.

### Keys

| Key | Attribute | Type | Description |
|-----|-----------|------|-------------|
| Partition Key | `userId` | String | Cognito user `sub` claim |
| Sort Key | `id` | String | UUID v4, generated via `crypto.randomUUID()` |

### Global Secondary Indexes

| Index Name | Partition Key | Sort Key | Projection |
|------------|---------------|----------|------------|
| `byCategory` | `userId` (String) | `createdAt` (String) | ALL |

The `byCategory` GSI allows querying a user's recipes sorted by creation date. Despite the name, category filtering is done application-side after the query.

### Billing and Configuration

- **Billing mode**: PAY_PER_REQUEST (on-demand, no capacity planning)
- **Encryption**: Customer-managed KMS key
- **Point-in-time recovery**: Enabled
- **Removal policy**: DESTROY (change for production)

## Interfaces

All interfaces are defined in `libs/shared/src/index.ts`.

### Recipe (main entity)

```typescript
interface Recipe {
  id: string;               // UUID v4, sort key
  userId: string;           // Cognito sub, partition key
  title: string;
  description: string;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  ingredients: Ingredient[];
  instructions: Instruction[];
  categories: string[];     // e.g., ["dinner", "italian"]
  tags: string[];           // e.g., ["quick", "vegetarian"]
  imageKeys: string[];      // S3 object keys for images
  nutritionalInfo: NutritionalInfo | null;
  createdAt: string;        // ISO 8601 timestamp
  updatedAt: string;        // ISO 8601 timestamp
}
```

### Ingredient

```typescript
interface Ingredient {
  amount: number;
  unit: string;           // e.g., "cups", "tbsp", "g"
  name: string;
  group: string | null;   // optional grouping, e.g., "sauce", "dough"
}
```

### Instruction

```typescript
interface Instruction {
  stepNumber: number;
  text: string;
}
```

### NutritionalInfo

```typescript
interface NutritionalInfo {
  calories: number | null;
  protein: string | null;       // e.g., "25g"
  carbohydrates: string | null; // e.g., "40g"
  fat: string | null;           // e.g., "12g"
}
```

### Input Types

```typescript
type CreateRecipeInput = Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
type UpdateRecipeInput = Omit<Recipe, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
```

The server generates `id`, sets `userId` from the auth token, and manages timestamps automatically.

## Access Patterns

| Pattern | Implementation |
|---------|---------------|
| List all recipes for a user | `Query` on PK `userId` |
| Get a single recipe | `GetItem` with PK `userId` + SK `id` |
| List recipes by creation date | `Query` on GSI `byCategory` (PK `userId`, SK `createdAt`) |
| Filter by category | Application-side filter on `categories` array after query |
| Filter by tag | Application-side filter on `tags` array after query |
| Create recipe | `PutItem` with full Recipe object |
| Update recipe | `UpdateCommand` with condition check for existence |
| Delete recipe | `DeleteCommand` with condition check for existence |

## Adding New Fields

1. Add the field to the `Recipe` interface in `libs/shared/src/index.ts`.
2. Add the field to `CreateRecipeInput` and `UpdateRecipeInput` if it should be user-provided (or add it to the `Omit` if server-managed).
3. Update the `updateRecipe` function in `apps/api/src/handler.ts` to include the new field in the `UpdateExpression` and `ExpressionAttributeValues`.
4. Update the `RecipeFormComponent` in `apps/web/src/app/recipes/recipe-form.component.ts` to include form controls for the field.
5. No DynamoDB schema migration is needed - DynamoDB is schemaless for non-key attributes.

## Adding New Indexes

1. Add the GSI in `apps/infra/src/stacks/recipe-manager-stack.ts` using `recipesTable.addGlobalSecondaryIndex(...)`.
2. Ensure the new index's key attributes are present on all items (or handle sparse indexes).
3. Add a new query function in `apps/api/src/handler.ts` using the `IndexName` parameter in `QueryCommand`.
4. Run `pnpm cdk synth` to verify the CloudFormation template.
5. Note: Adding a GSI on an existing table is an online operation but may take time to backfill.
