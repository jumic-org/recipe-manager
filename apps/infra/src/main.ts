import { App } from 'aws-cdk-lib';

import { RecipeManagerStack } from './stacks/recipe-manager-stack';

const app = new App();

// ── Main production stack ─────────────────────────────────────────────────────
new RecipeManagerStack(app, 'RecipeManagerStack', {
  description: 'Recipe Manager cloud resources',
});

// ── PR preview stack ──────────────────────────────────────────────────────────
// Synthesised only when the context values below are provided, e.g.:
//   cdk deploy RecipeManagerStack-PR42 \
//     -c prNumber=42 \
//     -c prUrl=https://github.com/owner/repo/pull/42 \
//     -c mainUserPoolId=eu-west-1_XXXXXXXXX \
//     -c mainUserPoolClientId=XXXXXXXXXXXXXXXXXXXXXXXXXX
const prNumber = app.node.tryGetContext('prNumber') as string | undefined;
const prUrl = app.node.tryGetContext('prUrl') as string | undefined;
const mainUserPoolId = app.node.tryGetContext('mainUserPoolId') as string | undefined;
const mainUserPoolClientId = app.node.tryGetContext('mainUserPoolClientId') as string | undefined;

if (prNumber && prUrl && mainUserPoolId && mainUserPoolClientId) {
  new RecipeManagerStack(app, `RecipeManagerStack-PR${prNumber}`, {
    description: `Recipe Manager PR #${prNumber} preview deployment`,
    prNumber,
    prUrl,
    mainUserPoolId,
    mainUserPoolClientId,
  });
}
