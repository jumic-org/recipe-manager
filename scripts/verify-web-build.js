#!/usr/bin/env node

/**
 * Post-build verification script for the web application.
 * Ensures that config.json exists in the build output and contains
 * all required keys as non-empty strings.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.resolve(
  __dirname,
  '..',
  'dist',
  'apps',
  'web',
  'browser',
  'config.json'
);

const REQUIRED_KEYS = ['apiUrl', 'userPoolId', 'userPoolClientId', 'region'];

function verify() {
  // Check file exists
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`ERROR: config.json not found at ${CONFIG_PATH}`);
    console.error(
      'The Angular build must include config.json in the output. ' +
        'Ensure apps/web/src/assets/config.json exists.'
    );
    process.exit(1);
  }

  // Read and parse JSON
  let config;
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    config = JSON.parse(content);
  } catch (err) {
    console.error(`ERROR: config.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }

  // Validate required keys
  const errors = [];
  for (const key of REQUIRED_KEYS) {
    if (!(key in config)) {
      errors.push(`Missing required key: "${key}"`);
    } else if (typeof config[key] !== 'string' || config[key].trim() === '') {
      errors.push(`Key "${key}" must be a non-empty string, got: ${JSON.stringify(config[key])}`);
    }
  }

  if (errors.length > 0) {
    console.error('ERROR: config.json validation failed:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log('OK: config.json is valid and contains all required keys.');
  console.log(`  Path: ${CONFIG_PATH}`);
  console.log(`  Keys: ${REQUIRED_KEYS.join(', ')}`);
}

verify();
