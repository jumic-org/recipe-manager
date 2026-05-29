import type {
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult
} from 'aws-lambda';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Origin': '*'
};

const sampleRecipes = [
  {
    id: 'lemon-herb-pasta',
    name: 'Lemon herb pasta',
    timeMinutes: 25,
    tags: ['weeknight', 'vegetarian']
  },
  {
    id: 'miso-roasted-vegetables',
    name: 'Miso roasted vegetables',
    timeMinutes: 40,
    tags: ['meal prep', 'vegan']
  }
];

export const handler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === 'OPTIONS') {
    return response(204);
  }

  if (event.httpMethod === 'GET' && event.path === '/') {
    return response(200, {
      name: 'recipe-manager-api',
      status: 'ok'
    });
  }

  if (event.path === '/recipes' && event.httpMethod === 'GET') {
    return response(200, {
      recipes: sampleRecipes
    });
  }

  if (event.path === '/recipes' && event.httpMethod === 'POST') {
    const recipe = event.body ? JSON.parse(event.body) : {};

    return response(201, {
      recipe: {
        id: crypto.randomUUID(),
        ...recipe
      }
    });
  }

  return response(404, {
    message: 'Route not found'
  });
};

function response(statusCode: number, body?: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: body === undefined ? '' : JSON.stringify(body)
  };
}
