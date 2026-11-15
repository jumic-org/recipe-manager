import dynamodbLocal from "dynamodb-local";
import { CreateTableCommand, DynamoDBClient, ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { createServer } from "node:net";

const TABLE_NAME = "recipe-manager-test";

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      server.close(() => (typeof address === "object" && address ? resolve(address.port) : reject(new Error("no port"))));
    });
  });
}

async function waitUntilReady(client: DynamoDBClient): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await client.send(new ListTablesCommand({}));
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error("DynamoDB Local did not start");
}

/**
 * Starts DynamoDB Local (in memory) once for the whole run and creates the table.
 * The handler reads its configuration from the environment, like in Lambda.
 */
export default async function setup() {
  const port = await freePort();
  await dynamodbLocal.launch(port, null);

  process.env.DYNAMODB_ENDPOINT = `http://127.0.0.1:${port}`;
  process.env.TABLE_NAME = TABLE_NAME;
  process.env.AWS_REGION = "eu-central-1";
  process.env.AWS_ACCESS_KEY_ID = "local";
  process.env.AWS_SECRET_ACCESS_KEY = "local";

  const client = new DynamoDBClient({ endpoint: process.env.DYNAMODB_ENDPOINT, maxAttempts: 1 });
  await waitUntilReady(client);
  await client.send(
    new CreateTableCommand({
      TableName: TABLE_NAME,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
    }),
  );
  client.destroy();

  return async () => {
    dynamodbLocal.stop(port);
  };
}
