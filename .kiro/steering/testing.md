# Testing

## Current State

The project does not currently have a test runner configured (Nx generators were set with `unitTestRunner: none`). This document describes the recommended testing strategy for adding tests.

## Recommended Test Runner

Use **Vitest** for all test types in this monorepo. It provides:

- Fast execution with native ESM support
- Compatible with TypeScript and the ES2022 target
- Works well with Nx caching

## Setup

Install Vitest as a dev dependency:

```bash
pnpm add -D vitest @vitest/coverage-v8
```

For Angular component tests, also install:

```bash
pnpm add -D @analogjs/vitest-angular jsdom
```

## Lambda Unit Tests (apps/api)

### Strategy

Test the handler logic by mocking DynamoDB operations. Focus on:

- Route matching (correct handler for path + method)
- Authentication extraction (userId from claims)
- Input validation
- DynamoDB command construction
- Error handling (missing body, not found, unauthorized)

### File Location

Place test files at `apps/api/src/handler.spec.ts` (co-located with source).

### Example Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './handler';

// Mock DynamoDB
vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: () => mockDocClient,
  },
  QueryCommand: vi.fn(),
  GetCommand: vi.fn(),
  PutCommand: vi.fn(),
  UpdateCommand: vi.fn(),
  DeleteCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(),
}));

const mockDocClient = {
  send: vi.fn(),
};

function createEvent(overrides: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/recipes',
    body: null,
    headers: {},
    queryStringParameters: null,
    pathParameters: null,
    requestContext: {
      authorizer: {
        claims: { sub: 'user-123' },
      },
    },
    ...overrides,
  } as unknown as APIGatewayProxyEvent;
}

describe('handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no user claims', async () => {
    const event = createEvent({
      requestContext: { authorizer: {} } as any,
    });
    const result = await handler(event, {} as any, () => {});
    expect(result?.statusCode).toBe(401);
  });

  it('lists recipes for authenticated user', async () => {
    mockDocClient.send.mockResolvedValueOnce({ Items: [] });
    const event = createEvent({ httpMethod: 'GET', path: '/recipes' });
    const result = await handler(event, {} as any, () => {});
    expect(result?.statusCode).toBe(200);
  });
});
```

### Key Assertions

- Verify `userId` is always passed to DynamoDB operations
- Verify CORS headers are present on all responses
- Verify 404 is returned for unknown routes
- Verify 204 is returned for OPTIONS (preflight)

## Angular Component Tests (apps/web)

### Strategy

Test components in isolation using Angular's `TestBed`. Mock services to avoid HTTP calls. Focus on:

- Component rendering
- User interaction (form submission, button clicks)
- Reactive state changes
- Route navigation

### File Location

Co-locate test files: `apps/web/src/app/recipes/recipe-list.component.spec.ts`.

### Example Pattern

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RecipeListComponent } from './recipe-list.component';
import { RecipeService } from './recipe.service';

describe('RecipeListComponent', () => {
  let fixture: ComponentFixture<RecipeListComponent>;
  let mockRecipeService: { getRecipes: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRecipeService = {
      getRecipes: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [RecipeListComponent],
      providers: [{ provide: RecipeService, useValue: mockRecipeService }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RecipeListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should call getRecipes on init', () => {
    expect(mockRecipeService.getRecipes).toHaveBeenCalled();
  });
});
```

## CDK Infrastructure Tests (apps/infra)

### Strategy

Use CDK assertions (`aws-cdk-lib/assertions`) to validate synthesized templates. Focus on:

- Expected resources exist
- Resource properties match expectations
- IAM permissions are correctly scoped
- Encryption is configured

### File Location

`apps/infra/src/stacks/recipe-manager-stack.spec.ts`

### Example Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { RecipeManagerStack } from './recipe-manager-stack';

describe('RecipeManagerStack', () => {
  const app = new App();
  const stack = new RecipeManagerStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  it('creates a DynamoDB table with correct keys', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'id', KeyType: 'RANGE' },
      ],
    });
  });

  it('creates a Cognito User Pool', () => {
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
  });

  it('creates a Lambda function with Node.js runtime', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      MemorySize: 256,
    });
  });

  it('creates a REST API', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'recipe-manager-api',
    });
  });

  it('enables KMS encryption on DynamoDB', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      SSESpecification: {
        SSEEnabled: true,
        SSEType: 'KMS',
      },
    });
  });
});
```

## Integration Testing

For end-to-end testing against a deployed stack:

1. Deploy to a test environment.
2. Create a test user in Cognito via the AWS CLI:
   ```bash
   aws cognito-idp admin-create-user --user-pool-id POOL_ID --username test@example.com
   aws cognito-idp admin-set-user-password --user-pool-id POOL_ID --username test@example.com --password "TestPass1!" --permanent
   ```
3. Obtain an ID token:
   ```bash
   aws cognito-idp initiate-auth \
     --client-id CLIENT_ID \
     --auth-flow USER_PASSWORD_AUTH \
     --auth-parameters USERNAME=test@example.com,PASSWORD="TestPass1!"
   ```
4. Execute API calls against the deployed API URL with the token:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" https://API_URL/recipes
   ```

## Running Tests

Once configured, run tests via Nx:

```bash
# All tests
pnpm nx run-many -t test

# Specific project
pnpm nx test api
pnpm nx test web
pnpm nx test infra
```

## Test Coverage

Configure coverage in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', 'dist/', 'cdk.out/'],
    },
  },
});
```

## What to Test (Priority Order)

1. **Lambda handler**: Route matching, auth extraction, CRUD operations, error paths
2. **CDK stack**: Resource existence, properties, permissions
3. **Angular services**: HTTP calls, token management
4. **Angular components**: Form validation, user interactions, state rendering
5. **Integration**: Full request flow against deployed environment
