import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  /** JWT claims of the signed-in User. Omit to simulate an unauthenticated call. */
  user?: { sub: string };
}

/** Builds the event API Gateway (HTTP API, payload v2) hands to a Lambda handler. */
export function apiRequest(request: ApiRequest): APIGatewayProxyEventV2WithJWTAuthorizer {
  return {
    version: '2.0',
    routeKey: `${request.method} ${request.path}`,
    rawPath: request.path,
    rawQueryString: '',
    headers: { 'content-type': 'application/json' },
    requestContext: {
      accountId: '123456789012',
      apiId: 'test',
      domainName: 'test.execute-api.eu-central-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: request.method,
        path: request.path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'vitest',
      },
      requestId: 'request-id',
      routeKey: `${request.method} ${request.path}`,
      stage: '$default',
      time: '01/Jan/2026:00:00:00 +0000',
      timeEpoch: 1767225600000,
      ...(request.user
        ? { authorizer: { jwt: { claims: { sub: request.user.sub }, scopes: [] } } }
        : {}),
    },
    body: request.body === undefined ? undefined : JSON.stringify(request.body),
    isBase64Encoded: false,
  } as APIGatewayProxyEventV2WithJWTAuthorizer;
}
