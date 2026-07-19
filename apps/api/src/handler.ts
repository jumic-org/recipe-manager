import type {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult
} from 'aws-lambda';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import type { Recipe, CreateRecipeInput, UpdateRecipeInput } from '@recipe-manager/shared';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env['TABLE_NAME'] ?? '';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Origin': '*'
};

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
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
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const category = event.queryStringParameters?.['category'];
  const tag = event.queryStringParameters?.['tag'];

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    })
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

async function getRecipe(
  userId: string,
  recipeId: string
): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId, id: recipeId }
    })
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
  event: APIGatewayProxyEvent
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
    updatedAt: now
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: recipe
    })
  );

  return response(201, { recipe });
}

async function updateRecipe(
  userId: string,
  recipeId: string,
  event: APIGatewayProxyEvent
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
    'updatedAt = :updatedAt'
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
          ':updatedAt': now
        },
        ConditionExpression: 'attribute_exists(userId) AND attribute_exists(id)',
        ReturnValues: 'ALL_NEW'
      })
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

async function deleteRecipe(
  userId: string,
  recipeId: string
): Promise<APIGatewayProxyResult> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { userId, id: recipeId },
        ConditionExpression: 'attribute_exists(userId) AND attribute_exists(id)'
      })
    );

    return response(204);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return response(404, { message: 'Recipe not found' });
    }
    throw error;
  }
}

function response(statusCode: number, body?: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: body === undefined ? '' : JSON.stringify(body)
  };
}
