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
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Supermarket, CreateSupermarketInput, UpdateSupermarketInput, Aisle } from '@recipe-manager/shared';
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

    // GET /supermarkets - list for user
    if (path === '/supermarkets' && method === 'GET') {
      return await listSupermarkets(userId);
    }

    // POST /supermarkets - create
    if (path === '/supermarkets' && method === 'POST') {
      return await createSupermarket(userId, event);
    }

    // Match /supermarkets/{id}
    const smIdMatch = path.match(/^\/supermarkets\/([^/]+)$/);
    if (smIdMatch) {
      const smId = smIdMatch[1];

      // PUT /supermarkets/{id}
      if (method === 'PUT') {
        return await updateSupermarket(userId, smId, event);
      }

      // DELETE /supermarkets/{id}
      if (method === 'DELETE') {
        return await deleteSupermarket(userId, smId);
      }
    }

    return response(404, { message: 'Route not found' });
  } catch (error) {
    console.error('Unhandled error:', error);
    return response(500, { message: 'Internal server error' });
  }
};

async function listSupermarkets(userId: string): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'byEntityType',
      KeyConditionExpression: 'userId = :userId AND entityType = :entityType',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':entityType': 'supermarket',
      },
    }),
  );

  const supermarkets = (result.Items ?? []) as Supermarket[];
  return response(200, { supermarkets });
}

async function createSupermarket(
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

  if (!Array.isArray(parsed['aisles'])) {
    return response(400, { message: 'aisles is required and must be an array' });
  }

  const aislesValid = (parsed['aisles'] as unknown[]).every(
    (el) =>
      typeof el === 'object' &&
      el !== null &&
      typeof (el as Record<string, unknown>)['name'] === 'string' &&
      ((el as Record<string, unknown>)['name'] as string).trim().length > 0 &&
      ((el as Record<string, unknown>)['comment'] === undefined ||
        typeof (el as Record<string, unknown>)['comment'] === 'string'),
  );
  if (!aislesValid) {
    return response(400, { message: 'Every aisle must be an object with a non-empty name and an optional comment string' });
  }

  const aisles: Aisle[] = (parsed['aisles'] as Record<string, unknown>[]).map((el) => {
    const aisle: Aisle = { name: (el['name'] as string).trim() };
    if (el['comment'] && typeof el['comment'] === 'string' && el['comment'].trim().length > 0) {
      aisle.comment = el['comment'].trim();
    }
    return aisle;
  });

  const input: CreateSupermarketInput = {
    name: parsed['name'] as string,
    aisles,
  };
  const now = new Date().toISOString();

  const item: Supermarket = {
    id: `sm_${crypto.randomUUID()}`,
    userId,
    entityType: 'supermarket',
    name: input.name,
    aisles: input.aisles,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );

  return response(201, { supermarket: item });
}

async function updateSupermarket(
  userId: string,
  smId: string,
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

  if (!Array.isArray(parsed['aisles'])) {
    return response(400, { message: 'aisles is required and must be an array' });
  }

  const aislesValid = (parsed['aisles'] as unknown[]).every(
    (el) =>
      typeof el === 'object' &&
      el !== null &&
      typeof (el as Record<string, unknown>)['name'] === 'string' &&
      ((el as Record<string, unknown>)['name'] as string).trim().length > 0 &&
      ((el as Record<string, unknown>)['comment'] === undefined ||
        typeof (el as Record<string, unknown>)['comment'] === 'string'),
  );
  if (!aislesValid) {
    return response(400, { message: 'Every aisle must be an object with a non-empty name and an optional comment string' });
  }

  const aisles: Aisle[] = (parsed['aisles'] as Record<string, unknown>[]).map((el) => {
    const aisle: Aisle = { name: (el['name'] as string).trim() };
    if (el['comment'] && typeof el['comment'] === 'string' && el['comment'].trim().length > 0) {
      aisle.comment = el['comment'].trim();
    }
    return aisle;
  });

  const input: UpdateSupermarketInput = {
    name: parsed['name'] as string,
    aisles,
  };
  const now = new Date().toISOString();

  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId, id: smId },
        UpdateExpression: 'SET #n = :name, aisles = :aisles, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#n': 'name',
        },
        ExpressionAttributeValues: {
          ':name': input.name,
          ':aisles': input.aisles,
          ':updatedAt': now,
        },
        ConditionExpression: 'attribute_exists(userId) AND attribute_exists(id)',
        ReturnValues: 'ALL_NEW',
      }),
    );

    if (!result.Attributes) {
      return response(404, { message: 'Supermarket not found' });
    }

    return response(200, { supermarket: result.Attributes as Supermarket });
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return response(404, { message: 'Supermarket not found' });
    }
    throw error;
  }
}

async function deleteSupermarket(
  userId: string,
  smId: string,
): Promise<APIGatewayProxyResult> {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { userId, id: smId },
        ConditionExpression: 'attribute_exists(userId) AND attribute_exists(id)',
      }),
    );

    return response(204);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return response(404, { message: 'Supermarket not found' });
    }
    throw error;
  }
}
