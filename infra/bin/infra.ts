import { App } from 'aws-cdk-lib';
import { RecipeManagerStack } from '../lib/recipe-manager-stack';

const app = new App();

new RecipeManagerStack(app, 'RecipeManager', {
  // One stack in Frankfurt; there is no separate test environment.
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'eu-central-1' },
});
