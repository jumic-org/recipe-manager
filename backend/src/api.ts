import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import type { ListRecipesResponse } from "@recipe-manager/shared";
import { createRecipeStore, type RecipeStore } from "./recipeStore";

export interface ApiDependencies {
  recipes: RecipeStore;
}

type ApiHandler = (event: APIGatewayProxyEventV2WithJWTAuthorizer) => Promise<APIGatewayProxyStructuredResultV2>;

function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

export function createHandler(deps: ApiDependencies): ApiHandler {
  return async (event) => {
    // API Gateway already rejects unauthenticated calls; this keeps the API closed if a route is ever added without the authorizer.
    if (!event.requestContext.authorizer?.jwt?.claims?.sub) {
      return json(401, { message: "Unauthorized" });
    }

    switch (event.routeKey) {
      case "GET /recipes": {
        const body: ListRecipesResponse = { recipes: await deps.recipes.listAll() };
        return json(200, body);
      }
      default:
        return json(404, { message: "Not found" });
    }
  };
}

let defaultHandler: ApiHandler | undefined;

/** Lambda entry point. Reads its configuration from the environment. */
export const handler: ApiHandler = (event) => {
  defaultHandler ??= createHandler({
    recipes: createRecipeStore({
      tableName: requiredEnv("TABLE_NAME"),
      endpoint: process.env.DYNAMODB_ENDPOINT,
    }),
  });
  return defaultHandler(event);
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
