import js from '@eslint/js';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const typeChecked = (project) => ({
  languageOptions: {
    parserOptions: { project, tsconfigRootDir: import.meta.dirname },
  },
});

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/cdk.out/',
      '**/.angular/',
      '**/.dynamodb-local/',
      'frontend/public/config.json',
    ],
  },

  // Config files at the repo root: plain JavaScript, not type-checked.
  {
    files: ['*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },

  // Names starting with an underscore mark values that are deliberately unused.
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },

  // shared, backend and infra: Node TypeScript.
  {
    files: ['shared/**/*.ts', 'backend/**/*.ts', 'infra/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: { globals: globals.node },
  },
  { files: ['shared/**/*.ts'], ...typeChecked(['shared/tsconfig.json']) },
  { files: ['backend/**/*.ts'], ...typeChecked(['backend/tsconfig.json']) },
  { files: ['infra/**/*.ts'], ...typeChecked(['infra/tsconfig.json']) },

  // frontend: Angular TypeScript and templates.
  {
    files: ['frontend/**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      angular.configs.tsRecommended,
    ],
    languageOptions: { globals: globals.browser },
    processor: angular.processInlineTemplates,
    ...typeChecked(['frontend/tsconfig.app.json', 'frontend/tsconfig.spec.json']),
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['frontend/**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },

  // Must stay last: turns off rules that conflict with Prettier.
  prettier,
);
