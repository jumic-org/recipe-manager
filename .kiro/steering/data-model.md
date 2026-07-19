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

## Example Data

Below are three complete JSON examples that conform to the `Recipe` interface. These can be used as reference data for testing, seeding, or understanding the data model.

### Example 1: Bienenstich (Bee Sting Cake)

```json
{
  "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "userId": "cognito-sub-12345678-abcd-efgh-ijkl-mnopqrstuvwx",
  "title": "Bienenstich (Bee Sting Cake)",
  "description": "A classic German yeast cake with a caramelized almond topping and vanilla custard filling. Perfect for afternoon coffee.",
  "servings": 12,
  "prepTimeMinutes": 45,
  "cookTimeMinutes": 30,
  "totalTimeMinutes": 75,
  "ingredients": [
    { "amount": 500, "unit": "g", "name": "all-purpose flour", "group": "dough" },
    { "amount": 80, "unit": "g", "name": "sugar", "group": "dough" },
    { "amount": 7, "unit": "g", "name": "active dry yeast", "group": "dough" },
    { "amount": 200, "unit": "ml", "name": "whole milk", "group": "dough" },
    { "amount": 80, "unit": "g", "name": "butter", "group": "dough" },
    { "amount": 1, "unit": "piece", "name": "egg", "group": "dough" },
    { "amount": 200, "unit": "g", "name": "sliced almonds", "group": "topping" },
    { "amount": 100, "unit": "g", "name": "butter", "group": "topping" },
    { "amount": 100, "unit": "g", "name": "sugar", "group": "topping" },
    { "amount": 3, "unit": "tbsp", "name": "heavy cream", "group": "topping" },
    { "amount": 500, "unit": "ml", "name": "whole milk", "group": "filling" },
    { "amount": 1, "unit": "packet", "name": "vanilla pudding mix", "group": "filling" },
    { "amount": 200, "unit": "ml", "name": "heavy cream", "group": "filling" }
  ],
  "instructions": [
    { "stepNumber": 1, "text": "Warm the milk to lukewarm and dissolve the yeast with a pinch of sugar. Let it activate for 10 minutes." },
    { "stepNumber": 2, "text": "Combine flour, sugar, melted butter, egg, and yeast mixture. Knead for 8 minutes until smooth and elastic." },
    { "stepNumber": 3, "text": "Cover the dough and let it rise in a warm place for 45 minutes until doubled in size." },
    { "stepNumber": 4, "text": "For the topping, melt butter in a saucepan, add sugar, cream, and almonds. Stir until combined and slightly caramelized." },
    { "stepNumber": 5, "text": "Roll out the dough onto a greased baking sheet and spread the almond topping evenly over it." },
    { "stepNumber": 6, "text": "Bake at 180C (350F) for 25-30 minutes until golden brown. Let cool completely." },
    { "stepNumber": 7, "text": "Prepare vanilla pudding according to package directions. Let cool, then fold in whipped cream." },
    { "stepNumber": 8, "text": "Slice the cake horizontally, spread the custard filling on the bottom half, and place the top back on." }
  ],
  "categories": ["baking", "german"],
  "tags": ["cake", "classic", "afternoon-coffee", "yeast-dough"],
  "imageKeys": ["recipes/a1b2c3d4/bienenstich-full.jpg", "recipes/a1b2c3d4/bienenstich-slice.jpg"],
  "nutritionalInfo": {
    "calories": 385,
    "protein": "8g",
    "carbohydrates": "45g",
    "fat": "19g"
  },
  "createdAt": "2024-11-15T09:30:00.000Z",
  "updatedAt": "2024-11-15T09:30:00.000Z"
}
```

### Example 2: One-Pot Pasta with Pumpkin and Sage

```json
{
  "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
  "userId": "cognito-sub-12345678-abcd-efgh-ijkl-mnopqrstuvwx",
  "title": "One-Pot Pasta with Pumpkin and Sage",
  "description": "A creamy autumn pasta dish made entirely in one pot. Butternut pumpkin melts into a silky sauce with crispy sage leaves.",
  "servings": 4,
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 20,
  "totalTimeMinutes": 30,
  "ingredients": [
    { "amount": 400, "unit": "g", "name": "penne pasta", "group": null },
    { "amount": 500, "unit": "g", "name": "butternut pumpkin, diced", "group": null },
    { "amount": 1, "unit": "piece", "name": "onion, finely chopped", "group": null },
    { "amount": 2, "unit": "cloves", "name": "garlic, minced", "group": null },
    { "amount": 800, "unit": "ml", "name": "vegetable broth", "group": null },
    { "amount": 200, "unit": "ml", "name": "heavy cream", "group": null },
    { "amount": 15, "unit": "leaves", "name": "fresh sage", "group": null },
    { "amount": 50, "unit": "g", "name": "parmesan cheese, grated", "group": null },
    { "amount": 2, "unit": "tbsp", "name": "olive oil", "group": null },
    { "amount": 0.5, "unit": "tsp", "name": "nutmeg", "group": null },
    { "amount": 1, "unit": "pinch", "name": "salt and pepper", "group": null }
  ],
  "instructions": [
    { "stepNumber": 1, "text": "Heat olive oil in a large pot over medium heat. Saute onion and garlic for 2 minutes until fragrant." },
    { "stepNumber": 2, "text": "Add the diced pumpkin and cook for 3 minutes, stirring occasionally." },
    { "stepNumber": 3, "text": "Add pasta, vegetable broth, and cream. Bring to a boil, then reduce to a simmer." },
    { "stepNumber": 4, "text": "Cook for 15 minutes, stirring every few minutes, until pasta is al dente and pumpkin is soft." },
    { "stepNumber": 5, "text": "Meanwhile, fry sage leaves in a small pan with a little butter until crispy. Set aside on paper towel." },
    { "stepNumber": 6, "text": "Stir in parmesan and nutmeg. Season with salt and pepper. The sauce should be creamy and coat the pasta." },
    { "stepNumber": 7, "text": "Serve topped with crispy sage leaves and extra parmesan." }
  ],
  "categories": ["dinner", "italian"],
  "tags": ["quick", "vegetarian", "one-pot", "autumn"],
  "imageKeys": ["recipes/b2c3d4e5/pumpkin-pasta-bowl.jpg"],
  "nutritionalInfo": {
    "calories": 520,
    "protein": "16g",
    "carbohydrates": "68g",
    "fat": "21g"
  },
  "createdAt": "2024-10-22T18:15:00.000Z",
  "updatedAt": "2024-10-23T08:00:00.000Z"
}
```

### Example 3: Baby Pizza (Mini Pizzas for Kids)

```json
{
  "id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
  "userId": "cognito-sub-12345678-abcd-efgh-ijkl-mnopqrstuvwx",
  "title": "Baby Pizza (Mini Pizzas for Kids)",
  "description": "Soft mini pizzas with a mild tomato sauce and fun toppings. Perfect for little hands and picky eaters. Kids love shaping their own dough!",
  "servings": 8,
  "prepTimeMinutes": 20,
  "cookTimeMinutes": 12,
  "totalTimeMinutes": 32,
  "ingredients": [
    { "amount": 300, "unit": "g", "name": "all-purpose flour", "group": "dough" },
    { "amount": 5, "unit": "g", "name": "instant yeast", "group": "dough" },
    { "amount": 1, "unit": "tsp", "name": "sugar", "group": "dough" },
    { "amount": 180, "unit": "ml", "name": "warm water", "group": "dough" },
    { "amount": 2, "unit": "tbsp", "name": "olive oil", "group": "dough" },
    { "amount": 0.5, "unit": "tsp", "name": "salt", "group": "dough" },
    { "amount": 200, "unit": "g", "name": "passata (strained tomatoes)", "group": "sauce" },
    { "amount": 1, "unit": "tsp", "name": "dried oregano", "group": "sauce" },
    { "amount": 1, "unit": "pinch", "name": "sugar", "group": "sauce" },
    { "amount": 200, "unit": "g", "name": "mozzarella, shredded", "group": "topping" },
    { "amount": 100, "unit": "g", "name": "ham, diced", "group": "topping" },
    { "amount": 50, "unit": "g", "name": "corn kernels", "group": "topping" },
    { "amount": 1, "unit": "piece", "name": "bell pepper, diced small", "group": "topping" }
  ],
  "instructions": [
    { "stepNumber": 1, "text": "Mix flour, yeast, sugar, and salt in a bowl. Add warm water and olive oil, then knead for 5 minutes until smooth." },
    { "stepNumber": 2, "text": "Let the dough rest for 10 minutes covered with a towel." },
    { "stepNumber": 3, "text": "Mix passata with oregano and a pinch of sugar for a mild pizza sauce." },
    { "stepNumber": 4, "text": "Divide dough into 8 small balls. Roll or press each into a mini pizza round (about 10cm diameter)." },
    { "stepNumber": 5, "text": "Place on a lined baking sheet. Spread sauce on each mini pizza, then add cheese and toppings." },
    { "stepNumber": 6, "text": "Bake at 220C (425F) for 10-12 minutes until cheese is bubbly and edges are golden." },
    { "stepNumber": 7, "text": "Let cool for 2 minutes before serving. These freeze well for quick weekday meals." }
  ],
  "categories": ["dinner", "snack"],
  "tags": ["kid-friendly", "freezer-friendly", "fun", "easy"],
  "imageKeys": [],
  "nutritionalInfo": {
    "calories": 245,
    "protein": "11g",
    "carbohydrates": "32g",
    "fat": "8g"
  },
  "createdAt": "2024-12-01T14:00:00.000Z",
  "updatedAt": "2024-12-01T14:00:00.000Z"
}
```

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
