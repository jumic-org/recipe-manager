import type {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { IngredientOnHand, CreateIngredientOnHandInput } from '@recipe-manager/shared';
import { docClient, TABLE_NAME, response, getUserId } from '../shared';

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return response(204);
  }

  try {
    const userId = getUserId(event);
    if (!userId) {
      return response(401, { message: 'Unauthorized' });
    }

    const path = event.path;
    const method = event.httpMethod;

    // GET /ingredients-on-hand - list for user
    if (path === '/ingredients-on-hand' && method === 'GET') {
      return await listIngredientsOnHand(userId);
    }

    // POST /ingredients-on-hand - create
    if (path === '/ingredients-on-hand' && method === 'POST') {
      return await createIngredientOnHand(userId, event);
    }

    // Match /ingredients-on-hand/{id}
    const iohIdMatch = path.match(/^\/ingredients-on-hand\/([^/]+)$/);
    if (iohIdMatch) {
      const iohId = iohIdMatch[1];

      // DELETE /ingredients-on-hand/{id}
      if (method === 'DELETE') {
        return await deleteIngredientOnHand(userId, iohId);
      }
    }

    return response(404, { message: 'Route not found' });
  } catch (error) {
    console.error('Unhandled error:', error);
    return response(500, { message: 'Internal server error' });
  }
};

async function listIngredientsOnHand(userId: string): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'byEntityType',
      KeyConditionExpression: 'userId = :userId AND entityType = :entityType',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':entityType': 'ingredientOnHand',
      },
    }),
  );

  const ingredientsOnHand = (result.Items ?? []) as IngredientOnHand[];
  return response(200, { ingredientsOnHand });
}

async function createIngredientOnHand(
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

  if (!parsed['name'] || typeof parsed['name'] !== 'string') {
    return response(400, { message: 'name is required and must be a string' });
  }

  const input: CreateIngredientOnHandInput = { name: parsed['name'] as string };
  const now = new Date().toISOString();

  const item: IngredientOnHand = {
    id: `ioh_${crypto.randomUUID()}`,
    userId,
    entityType: 'ingredientOnHand',
    name: input.name,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );

  return response(201, { ingredientOnHand: item });
}

async function deleteIngredientOnHand(
  userId: string,
  iohId: string,
): Promise<APIGatewayProxyResult> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { userId, id: iohId },
        ConditionExpression: 'attribute_exists(userId) AND attribute_exists(id)',
      }),
    );

    return response(204);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return response(404, { message: 'Ingredient on hand not found' });
    }
    throw error;
  }
}
