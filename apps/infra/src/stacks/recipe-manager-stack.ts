import * as path from 'node:path';

import {
  CfnOutput,
  Duration,
  Stack,
  type StackProps
} from 'aws-cdk-lib';
import {
  Cors,
  LambdaIntegration,
  RestApi
} from 'aws-cdk-lib/aws-apigateway';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class RecipeManagerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const apiHandler = new NodejsFunction(this, 'RecipeApiHandler', {
      entry: path.join(__dirname, '../../../api/src/handler.ts'),
      handler: 'handler',
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(10),
      bundling: {
        format: OutputFormat.CJS,
        minify: true,
        sourceMap: true
      }
    });

    const api = new RestApi(this, 'RecipeApi', {
      restApiName: 'recipe-manager-api',
      description: 'HTTP API for Recipe Manager',
      defaultCorsPreflightOptions: {
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowOrigins: Cors.ALL_ORIGINS
      },
      deployOptions: {
        stageName: 'prod'
      }
    });

    const lambdaIntegration = new LambdaIntegration(apiHandler);
    const recipes = api.root.addResource('recipes');

    api.root.addMethod('GET', lambdaIntegration);
    recipes.addMethod('GET', lambdaIntegration);
    recipes.addMethod('POST', lambdaIntegration);

    new CfnOutput(this, 'RecipeApiUrl', {
      value: api.url
    });
  }
}
