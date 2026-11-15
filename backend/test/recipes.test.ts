import { describe, expect, it } from 'vitest';
import type { ListRecipesResponse } from '@recipe-manager/shared';
import { handler } from '../src/api';
import { apiRequest } from './apiRequest';

const user = { sub: 'user-1' };

describe('GET /recipes', () => {
  it('returns an empty Recipe list for a signed-in User when the Collection is empty', async () => {
    const response = await handler(apiRequest({ method: 'GET', path: '/recipes', user }));

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body ?? '') as ListRecipesResponse;
    expect(body).toEqual({ recipes: [] });
  });

  it('rejects a call without a signed-in User', async () => {
    const response = await handler(apiRequest({ method: 'GET', path: '/recipes' }));

    expect(response.statusCode).toBe(401);
  });

  it('answers unknown routes with 404', async () => {
    const response = await handler(apiRequest({ method: 'GET', path: '/nope', user }));

    expect(response.statusCode).toBe(404);
  });
});
