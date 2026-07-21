#!/usr/bin/env node

/**
 * Post-build verification script for the web application.
 *
 * Verifies that:
 * 1. index.html exists in the build output (proves build succeeded)
 * 2. config.json does NOT exist in the build output
 *
 * config.json is deployed separately by CDK's ConfigDeployment, which generates
 * it with real Cognito/API values at deploy time. It must NOT be included in the
 * Angular build to avoid deploying placeholder values.
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.resolve(__dirname, '..', 'dist', 'apps', 'web', 'browser');
const INDEX_PATH = path.join(BUILD_DIR, 'index.html');
const CONFIG_PATH = path.join(BUILD_DIR, 'config.json');

function verify() {
  // Check that the build output directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    console.error(`ERROR: Build output directory not found at ${BUILD_DIR}`);
    console.error('Run "pnpm nx build web" before running this script.');
    process.exit(1);
  }

  // Check that index.html exists (proves build succeeded)
  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`ERROR: index.html not found at ${INDEX_PATH}`);
    console.error('The Angular build did not produce index.html.');
    process.exit(1);
  }

  console.log('OK: index.html exists in build output.');

  // Check that config.json does NOT exist in build output.
  // config.json is deployed separately by CDK's ConfigDeployment with real
  // Cognito User Pool and API Gateway values. Including a placeholder in the
  // Angular build causes production errors ("User pool client YOUR_USER_POOL_CLIENT_ID does not exist").
  if (fs.existsSync(CONFIG_PATH)) {
    console.error(`ERROR: config.json found in build output at ${CONFIG_PATH}`);
    console.error(
      'config.json must NOT be included in the Angular build. ' +
        'It is deployed separately by CDK ConfigDeployment with real infrastructure values. ' +
        'Remove the config.json asset entry from apps/web/project.json.',
    );
    process.exit(1);
  }

  console.log('OK: config.json is NOT in build output (will be deployed by CDK ConfigDeployment).');
  console.log('\nBuild verification passed.');
}

verify();
