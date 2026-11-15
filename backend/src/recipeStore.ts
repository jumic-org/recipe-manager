import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Recipe } from '@recipe-manager/shared';

/** All Recipes of the Collection share one partition; there is exactly one Collection. */
const RECIPES_PARTITION = 'RECIPES';

export interface RecipeStore {
  listAll(): Promise<Recipe[]>;
}

export function createRecipeStore(options: { tableName: string; endpoint?: string }): RecipeStore {
  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient(options.endpoint ? { endpoint: options.endpoint } : {}),
    { marshallOptions: { removeUndefinedValues: true } },
  );

  return {
    async listAll() {
      const recipes: Recipe[] = [];
      let startKey: Record<string, unknown> | undefined;
      do {
        const page = await client.send(
          new QueryCommand({
            TableName: options.tableName,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: { ':pk': RECIPES_PARTITION },
            ExclusiveStartKey: startKey,
          }),
        );
        for (const item of page.Items ?? []) {
          const { pk: _pk, sk: _sk, ...recipe } = item;
          recipes.push(recipe as Recipe);
        }
        startKey = page.LastEvaluatedKey;
      } while (startKey);
      return recipes;
    },
  };
}
