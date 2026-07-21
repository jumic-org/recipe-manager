import { App } from 'aws-cdk-lib';

import { RecipeManagerStack } from './stacks/recipe-manager-stack';

const app = new App();

new RecipeManagerStack(app, 'RecipeManagerStack', {
  description: 'Recipe Manager cloud resources',
});
