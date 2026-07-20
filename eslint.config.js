const tseslint = require('typescript-eslint');
const nxPlugin = require('@nx/eslint-plugin');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: ['**/dist/', '**/node_modules/', '**/.nx/', '**/coverage/', '**/.angular/']
  },
  {
    plugins: {
      '@nx': nxPlugin
    }
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true
      }
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: [],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*']
            }
          ]
        }
      ]
    }
  },
  eslintConfigPrettier
);
