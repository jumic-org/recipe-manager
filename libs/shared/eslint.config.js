const baseConfig = require('../../eslint.config.js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(...baseConfig, {
  files: ['src/**/*.ts'],
  rules: {},
});
