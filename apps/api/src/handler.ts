import type {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { Recipe, CreateRecipeInput, UpdateRecipeInput } from '@recipe-manager/shared';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env['TABLE_NAME'] ?? '';

const BEDROCK_REGION = process.env['BEDROCK_REGION'] ?? process.env['AWS_REGION'] ?? 'eu-central-1';
const bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_REGION });

const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return response(204);
  }

  try {
    const userId = event.requestContext?.authorizer?.['claims']?.['sub'] as string | undefined;
    if (!userId) {
      return response(401, { message: 'Unauthorized' });
    }

    const path = event.path;
    const method = event.httpMethod;

    // GET /recipes - list user recipes
    if (path === '/recipes' && method === 'GET') {
      return await listRecipes(userId, event);
    }

    // POST /recipes - create recipe
    if (path === '/recipes' && method === 'POST') {
      return await createRecipe(userId, event);
    }

    // POST /recipes/import - import recipe from URL
    if (path === '/recipes/import' && method === 'POST') {
      return await importRecipe(userId, event);
    }

    // Match /recipes/{id}
    const recipeIdMatch = path.match(/^\/recipes\/([^/]+)$/);
    if (recipeIdMatch) {
      const recipeId = recipeIdMatch[1];

      // GET /recipes/{id}
      if (method === 'GET') {
        return await getRecipe(userId, recipeId);
      }

      // PUT /recipes/{id}
      if (method === 'PUT') {
        return await updateRecipe(userId, recipeId, event);
      }

      // DELETE /recipes/{id}
      if (method === 'DELETE') {
        return await deleteRecipe(userId, recipeId);
      }
    }

    return response(404, { message: 'Route not found' });
  } catch (error) {
    console.error('Unhandled error:', error);
    return response(500, { message: 'Internal server error' });
  }
};

async function listRecipes(
  userId: string,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const category = event.queryStringParameters?.['category'];
  const tag = event.queryStringParameters?.['tag'];

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    }),
  );

  let recipes = (result.Items ?? []) as Recipe[];

  if (category) {
    recipes = recipes.filter((r) => r.categories.includes(category));
  }

  if (tag) {
    recipes = recipes.filter((r) => r.tags.includes(tag));
  }

  return response(200, { recipes });
}

async function getRecipe(userId: string, recipeId: string): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId, id: recipeId },
    }),
  );

  if (!result.Item) {
    return response(404, { message: 'Recipe not found' });
  }

  return response(200, { recipe: result.Item as Recipe });
}

function validateRecipeInput(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return ['Request body must be a JSON object'];
  }
  const body = input as Record<string, unknown>;
  if (!body['title'] || typeof body['title'] !== 'string') {
    errors.push('title is required and must be a string');
  }
  if (body['servings'] === undefined || typeof body['servings'] !== 'number') {
    errors.push('servings is required and must be a number');
  }
  if (!Array.isArray(body['ingredients'])) {
    errors.push('ingredients is required and must be an array');
  }
  if (!Array.isArray(body['instructions'])) {
    errors.push('instructions is required and must be an array');
  }
  return errors;
}

async function createRecipe(
  userId: string,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { message: 'Request body is required' });
  }

  const parsed = JSON.parse(event.body);
  const validationErrors = validateRecipeInput(parsed);
  if (validationErrors.length > 0) {
    return response(400, { message: 'Validation failed', errors: validationErrors });
  }

  const input: CreateRecipeInput = parsed;
  const now = new Date().toISOString();

  const recipe: Recipe = {
    ...input,
    id: crypto.randomUUID(),
    userId,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: recipe,
    }),
  );

  return response(201, { recipe });
}

async function updateRecipe(
  userId: string,
  recipeId: string,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { message: 'Request body is required' });
  }

  const parsed = JSON.parse(event.body);
  const validationErrors = validateRecipeInput(parsed);
  if (validationErrors.length > 0) {
    return response(400, { message: 'Validation failed', errors: validationErrors });
  }

  const input: UpdateRecipeInput = parsed;
  const now = new Date().toISOString();

  const updateExpression = [
    'SET title = :title',
    'description = :description',
    'servings = :servings',
    'prepTimeMinutes = :prepTimeMinutes',
    'cookTimeMinutes = :cookTimeMinutes',
    'totalTimeMinutes = :totalTimeMinutes',
    'ingredients = :ingredients',
    'instructions = :instructions',
    'categories = :categories',
    'tags = :tags',
    'imageKeys = :imageKeys',
    'nutritionalInfo = :nutritionalInfo',
    'updatedAt = :updatedAt',
  ].join(', ');

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId, id: recipeId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: {
          ':title': input.title,
          ':description': input.description,
          ':servings': input.servings,
          ':prepTimeMinutes': input.prepTimeMinutes,
          ':cookTimeMinutes': input.cookTimeMinutes,
          ':totalTimeMinutes': input.totalTimeMinutes,
          ':ingredients': input.ingredients,
          ':instructions': input.instructions,
          ':categories': input.categories,
          ':tags': input.tags,
          ':imageKeys': input.imageKeys,
          ':nutritionalInfo': input.nutritionalInfo,
          ':updatedAt': now,
        },
        ConditionExpression: 'attribute_exists(userId) AND attribute_exists(id)',
        ReturnValues: 'ALL_NEW',
      }),
    );

    if (!result.Attributes) {
      return response(404, { message: 'Recipe not found' });
    }

    return response(200, { recipe: result.Attributes as Recipe });
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return response(404, { message: 'Recipe not found' });
    }
    throw error;
  }
}

async function deleteRecipe(userId: string, recipeId: string): Promise<APIGatewayProxyResult> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { userId, id: recipeId },
        ConditionExpression: 'attribute_exists(userId) AND attribute_exists(id)',
      }),
    );

    return response(204);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return response(404, { message: 'Recipe not found' });
    }
    throw error;
  }
}

function stripHtmlToText(html: string): string {
  // Remove script and style elements and their content
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove nav, header, footer elements
  text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '');
  text = text.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '');
  text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');
  // Replace block-level elements with newlines
  text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr|td|th|blockquote)[^>]*>/gi, '\n');
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  // Collapse multiple whitespace/newlines
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n');
  return text.trim().substring(0, 10000);
}

function buildBedrockPrompt(pageContent: string): string {
  const example1 = JSON.stringify({
    title: "Bienenstich (Bee Sting Cake)",
    description: "A classic German yeast cake with a caramelized almond topping and vanilla custard filling. Perfect for afternoon coffee.",
    servings: 12,
    prepTimeMinutes: 45,
    cookTimeMinutes: 30,
    totalTimeMinutes: 75,
    ingredients: [
      { amount: 500, unit: "g", name: "all-purpose flour", group: "dough" },
      { amount: 80, unit: "g", name: "sugar", group: "dough" },
      { amount: 7, unit: "g", name: "active dry yeast", group: "dough" },
      { amount: 200, unit: "ml", name: "whole milk", group: "dough" },
      { amount: 80, unit: "g", name: "butter", group: "dough" },
      { amount: 1, unit: "piece", name: "egg", group: "dough" },
      { amount: 200, unit: "g", name: "sliced almonds", group: "topping" },
      { amount: 100, unit: "g", name: "butter", group: "topping" },
      { amount: 100, unit: "g", name: "sugar", group: "topping" },
      { amount: 3, unit: "tbsp", name: "heavy cream", group: "topping" },
      { amount: 500, unit: "ml", name: "whole milk", group: "filling" },
      { amount: 1, unit: "packet", name: "vanilla pudding mix", group: "filling" },
      { amount: 200, unit: "ml", name: "heavy cream", group: "filling" }
    ],
    instructions: [
      { stepNumber: 1, text: "Warm the milk to lukewarm and dissolve the yeast with a pinch of sugar. Let it activate for 10 minutes." },
      { stepNumber: 2, text: "Combine flour, sugar, melted butter, egg, and yeast mixture. Knead for 8 minutes until smooth and elastic." },
      { stepNumber: 3, text: "Cover the dough and let it rise in a warm place for 45 minutes until doubled in size." },
      { stepNumber: 4, text: "For the topping, melt butter in a saucepan, add sugar, cream, and almonds. Stir until combined and slightly caramelized." },
      { stepNumber: 5, text: "Roll out the dough onto a greased baking sheet and spread the almond topping evenly over it." },
      { stepNumber: 6, text: "Bake at 180C (350F) for 25-30 minutes until golden brown. Let cool completely." },
      { stepNumber: 7, text: "Prepare vanilla pudding according to package directions. Let cool, then fold in whipped cream." },
      { stepNumber: 8, text: "Slice the cake horizontally, spread the custard filling on the bottom half, and place the top back on." }
    ],
    categories: ["baking", "german"],
    tags: ["cake", "classic", "afternoon-coffee", "yeast-dough"],
    imageKeys: [],
    nutritionalInfo: { calories: 385, protein: "8g", carbohydrates: "45g", fat: "19g" }
  }, null, 2);

  const example2 = JSON.stringify({
    title: "One-Pot Pasta with Pumpkin and Sage",
    description: "A creamy autumn pasta dish made entirely in one pot. Butternut pumpkin melts into a silky sauce with crispy sage leaves.",
    servings: 4,
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    totalTimeMinutes: 30,
    ingredients: [
      { amount: 400, unit: "g", name: "penne pasta", group: null },
      { amount: 500, unit: "g", name: "butternut pumpkin, diced", group: null },
      { amount: 1, unit: "piece", name: "onion, finely chopped", group: null },
      { amount: 2, unit: "cloves", name: "garlic, minced", group: null },
      { amount: 800, unit: "ml", name: "vegetable broth", group: null },
      { amount: 200, unit: "ml", name: "heavy cream", group: null },
      { amount: 15, unit: "leaves", name: "fresh sage", group: null },
      { amount: 50, unit: "g", name: "parmesan cheese, grated", group: null },
      { amount: 2, unit: "tbsp", name: "olive oil", group: null },
      { amount: 0.5, unit: "tsp", name: "nutmeg", group: null },
      { amount: 1, unit: "pinch", name: "salt and pepper", group: null }
    ],
    instructions: [
      { stepNumber: 1, text: "Heat olive oil in a large pot over medium heat. Saute onion and garlic for 2 minutes until fragrant." },
      { stepNumber: 2, text: "Add the diced pumpkin and cook for 3 minutes, stirring occasionally." },
      { stepNumber: 3, text: "Add pasta, vegetable broth, and cream. Bring to a boil, then reduce to a simmer." },
      { stepNumber: 4, text: "Cook for 15 minutes, stirring every few minutes, until pasta is al dente and pumpkin is soft." },
      { stepNumber: 5, text: "Meanwhile, fry sage leaves in a small pan with a little butter until crispy. Set aside on paper towel." },
      { stepNumber: 6, text: "Stir in parmesan and nutmeg. Season with salt and pepper. The sauce should be creamy and coat the pasta." },
      { stepNumber: 7, text: "Serve topped with crispy sage leaves and extra parmesan." }
    ],
    categories: ["dinner", "italian"],
    tags: ["quick", "vegetarian", "one-pot", "autumn"],
    imageKeys: [],
    nutritionalInfo: { calories: 520, protein: "16g", carbohydrates: "68g", fat: "21g" }
  }, null, 2);

  const example3 = JSON.stringify({
    title: "Baby Pizza (Mini Pizzas for Kids)",
    description: "Soft mini pizzas with a mild tomato sauce and fun toppings. Perfect for little hands and picky eaters. Kids love shaping their own dough!",
    servings: 8,
    prepTimeMinutes: 20,
    cookTimeMinutes: 12,
    totalTimeMinutes: 32,
    ingredients: [
      { amount: 300, unit: "g", name: "all-purpose flour", group: "dough" },
      { amount: 5, unit: "g", name: "instant yeast", group: "dough" },
      { amount: 1, unit: "tsp", name: "sugar", group: "dough" },
      { amount: 180, unit: "ml", name: "warm water", group: "dough" },
      { amount: 2, unit: "tbsp", name: "olive oil", group: "dough" },
      { amount: 0.5, unit: "tsp", name: "salt", group: "dough" },
      { amount: 200, unit: "g", name: "passata (strained tomatoes)", group: "sauce" },
      { amount: 1, unit: "tsp", name: "dried oregano", group: "sauce" },
      { amount: 1, unit: "pinch", name: "sugar", group: "sauce" },
      { amount: 200, unit: "g", name: "mozzarella, shredded", group: "topping" },
      { amount: 100, unit: "g", name: "ham, diced", group: "topping" },
      { amount: 50, unit: "g", name: "corn kernels", group: "topping" },
      { amount: 1, unit: "piece", name: "bell pepper, diced small", group: "topping" }
    ],
    instructions: [
      { stepNumber: 1, text: "Mix flour, yeast, sugar, and salt in a bowl. Add warm water and olive oil, then knead for 5 minutes until smooth." },
      { stepNumber: 2, text: "Let the dough rest for 10 minutes covered with a towel." },
      { stepNumber: 3, text: "Mix passata with oregano and a pinch of sugar for a mild pizza sauce." },
      { stepNumber: 4, text: "Divide dough into 8 small balls. Roll or press each into a mini pizza round (about 10cm diameter)." },
      { stepNumber: 5, text: "Place on a lined baking sheet. Spread sauce on each mini pizza, then add cheese and toppings." },
      { stepNumber: 6, text: "Bake at 220C (425F) for 10-12 minutes until cheese is bubbly and edges are golden." },
      { stepNumber: 7, text: "Let cool for 2 minutes before serving. These freeze well for quick weekday meals." }
    ],
    categories: ["dinner", "snack"],
    tags: ["kid-friendly", "freezer-friendly", "fun", "easy"],
    imageKeys: [],
    nutritionalInfo: { calories: 245, protein: "11g", carbohydrates: "32g", fat: "8g" }
  }, null, 2);

  return `You are a recipe extraction assistant. Extract the recipe from the following web page content and return it as a single JSON object matching the CreateRecipeInput structure.

The JSON object must have these fields:
- title (string)
- description (string)
- servings (number)
- prepTimeMinutes (number)
- cookTimeMinutes (number)
- totalTimeMinutes (number)
- ingredients (array of { amount: number, unit: string, name: string, group: string | null })
- instructions (array of { stepNumber: number, text: string })
- categories (array of strings)
- tags (array of strings)
- imageKeys (always an empty array [])
- nutritionalInfo ({ calories: number | null, protein: string | null, carbohydrates: string | null, fat: string | null } or null)

Here are examples of the expected output format:

Example 1:
${example1}

Example 2:
${example2}

Example 3:
${example3}

Now extract the recipe from the following web page content and return ONLY a single valid JSON object (no markdown, no explanation, no wrapping):

${pageContent}`;
}

async function importRecipe(
  userId: string,
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  if (!event.body) {
    return response(400, { message: 'Request body is required' });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(event.body);
  } catch {
    return response(400, { message: 'Invalid JSON in request body' });
  }

  const url = parsed['url'];
  if (!url || typeof url !== 'string') {
    return response(400, { message: 'url is required and must be a string' });
  }

  // Fetch the web page content
  let pageHtml: string;
  try {
    const fetchResponse = await fetch(url);
    if (!fetchResponse.ok) {
      return response(502, { message: `Failed to fetch URL: HTTP ${fetchResponse.status}` });
    }
    pageHtml = await fetchResponse.text();
  } catch (error) {
    console.error('Error fetching URL:', error);
    return response(502, { message: 'Failed to fetch the provided URL' });
  }

  // Strip HTML to plain text
  const pageContent = stripHtmlToText(pageHtml);

  if (!pageContent) {
    return response(400, { message: 'No content could be extracted from the URL' });
  }

  // Call Bedrock to extract recipe
  const prompt = buildBedrockPrompt(pageContent);

  let recipeInput: CreateRecipeInput;
  try {
    const bedrockResponse = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: 'eu.amazon.nova-lite-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          messages: [{ role: 'user', content: [{ text: prompt }] }],
          inferenceConfig: { maxTokens: 4096, temperature: 0.2 },
        }),
      }),
    );

    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
    const outputText = responseBody['output']?.['message']?.['content']?.[0]?.['text'];

    if (!outputText) {
      console.error('Unexpected Bedrock response structure:', JSON.stringify(responseBody));
      return response(502, { message: 'Failed to get a valid response from AI model' });
    }

    // Parse the JSON from the model output (handle potential markdown code blocks)
    let jsonText = outputText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    recipeInput = JSON.parse(jsonText) as CreateRecipeInput;
  } catch (error) {
    console.error('Error calling Bedrock or parsing response:', error);
    return response(502, { message: 'Failed to extract recipe using AI model' });
  }

  // Save the recipe to DynamoDB (same as createRecipe logic)
  const now = new Date().toISOString();

  const recipe: Recipe = {
    ...recipeInput,
    id: crypto.randomUUID(),
    userId,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: recipe,
    }),
  );

  return response(201, { recipe });
}

function response(statusCode: number, body?: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: body === undefined ? '' : JSON.stringify(body),
  };
}
