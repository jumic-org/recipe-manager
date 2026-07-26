import type { APIGatewayProxyEvent } from 'aws-lambda';

export function getUserId(event: APIGatewayProxyEvent): string | undefined {
  return event.requestContext?.authorizer?.['claims']?.['sub'] as string | undefined;
}
