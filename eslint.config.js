'use strict';
const stylisticTs = require('@stylistic/eslint-plugin-ts');
const stylisticJs = require('@stylistic/eslint-plugin-js');
const parserTs = require('@typescript-eslint/parser');
const tsLint = require('@typescript-eslint/eslint-plugin');
const eslintPluginUnicorn = require('eslint-plugin-unicorn');
const oxlint = require('eslint-plugin-oxlint');

const tsRules = {
  'no-unused-vars': 'off',
  // '@typescript-eslint/no-unused-vars': [
  //   'warn',
  //   { argsIgnorePattern: '^_', ignoreRestSiblings: true },
  // ],
  '@typescript-eslint/no-mixed-enums': 'error',
  '@typescript-eslint/no-unsafe-enum-comparison': 'error',
  '@typescript-eslint/prefer-enum-initializers': 'error',
  '@typescript-eslint/prefer-literal-enum-member': 'error',
  '@typescript-eslint/adjacent-overload-signatures': 'error',
  '@typescript-eslint/no-array-delete': 'error',
  '@typescript-eslint/no-misused-new': 'error',
  //   '@typescript-eslint/no-misused-promises': [
  //     'error',
  //     {
  //       'checksConditionals': true,
  //       'checksSpreads': true,
  //       'checksVoidReturn': true
  //     }
  //   ],

  // FORMATTING RULES
  '@stylistic/ts/lines-between-class-members': ['error', 'always', { exceptAfterOverload: true }],
  '@stylistic/ts/member-delimiter-style': 'error',
  '@stylistic/ts/space-before-blocks': 'error',
  '@stylistic/ts/type-annotation-spacing': 'error',
  '@stylistic/js/block-spacing': 'error',
  '@stylistic/js/brace-style': ['error', '1tbs', { allowSingleLine: true }],
  '@stylistic/js/comma-dangle': ['error', 'always-multiline'],
  '@stylistic/js/comma-spacing': ['error', { before: false, after: true }],
  '@stylistic/js/function-call-spacing': ['error', 'never'],
  '@stylistic/js/key-spacing': ['error', { beforeColon: false, afterColon: true }],
  '@stylistic/js/keyword-spacing': ['error', { before: true, after: true }],
  '@stylistic/js/no-extra-semi': 'error',
  '@stylistic/js/object-curly-spacing': ['error', 'always'],
  '@stylistic/js/padding-line-between-statements': [
    'error',
    { blankLine: 'always', prev: '*', next: 'return' },
  ],
  '@stylistic/js/quote-props': ['error', 'as-needed'],
  '@stylistic/js/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
  '@stylistic/js/semi': 'error',
  '@stylistic/js/space-before-function-paren': ['error', {
    anonymous: 'always',
    named: 'never',
    asyncArrow: 'always',
  }],
  '@stylistic/js/space-infix-ops': 'error',

  '@stylistic/js/dot-location': ['error', 'property'],
  // https://github.com/sindresorhus/eslint-plugin-unicorn/tree/main/docs/rules
  '@unicorn/catch-error-name': [
    'error',
    {
      ignore: [
        '^error\\d*$',
        '^err\\d*$',
        /^ignore/i,
      ],
    },
  ],
  '@unicorn/filename-case': [
    'error',
    {
      case: 'kebabCase',
      'ignore': [
        '^relation--',
        '^\d\d\d\d\d\d',
        /^[0-9]{13}-/,
        /--/,
      ],
    },
  ],
  '@unicorn/new-for-builtins': 'error',
  '@unicorn/no-abusive-eslint-disable': 'error',
  '@unicorn/no-array-for-each': 'warn',
  '@unicorn/no-array-method-this-argument': 'error',
  '@unicorn/no-array-push-push': 'warn',
  '@unicorn/no-await-in-promise-methods': 'error',
  '@unicorn/no-for-loop': 'warn',
  '@unicorn/no-instanceof-array': 'error',
  '@unicorn/no-new-buffer': 'error',
  '@unicorn/no-static-only-class': 'error',
  '@unicorn/no-thenable': 'error',
  '@unicorn/no-typeof-undefined': 'error',
  '@unicorn/no-unnecessary-await': 'error',
  '@unicorn/no-unnecessary-polyfills': [
    'error',
    {
      targets: 'node > 16',
    },
  ],
  '@unicorn/no-unreadable-iife': 'error',
  '@unicorn/no-useless-fallback-in-spread': 'error',
  '@unicorn/no-useless-length-check': 'error',
  '@unicorn/no-useless-promise-resolve-reject': 'error',
  '@unicorn/no-useless-spread': 'error',
  '@unicorn/numeric-separators-style': ['error',
    {
      onlyIfContainsSeparator: false,
      number: { minimumDigits: 5, groupLength: 3 },
      octal: { minimumDigits: 0, groupLength: 4 },
      hexadecimal: { minimumDigits: 0, groupLength: 4 },
      binary: { minimumDigits: 0, groupLength: 8 },
    },
  ],
  '@unicorn/prefer-array-find': 'error',
  '@unicorn/prefer-array-flat': 'error',
  '@unicorn/prefer-array-flat-map': 'error',
  '@unicorn/prefer-array-index-of': 'error',
  '@unicorn/prefer-array-some': 'warn',
  '@unicorn/prefer-at': 'error',
  '@unicorn/prefer-code-point': 'error',
  '@unicorn/prefer-export-from': 'error',
  '@unicorn/prefer-includes': 'error',
  '@unicorn/prefer-json-parse-buffer': 'error',
  '@unicorn/prefer-logical-operator-over-ternary': 'warn',
  '@unicorn/prefer-math-trunc': 'error',
  '@unicorn/prefer-modern-math-apis': 'error',
  // '@unicorn/prefer-module': 'error',
  '@unicorn/prefer-negative-index': 'error',
  '@unicorn/prefer-node-protocol': 'error',
  '@unicorn/prefer-number-properties': 'error',
  '@unicorn/prefer-prototype-methods': 'error',
  '@unicorn/prefer-regexp-test': 'error',
  '@unicorn/prefer-set-has': 'error',
  '@unicorn/prefer-set-size': 'error',
  '@unicorn/prefer-spread': 'error',
  '@unicorn/prefer-string-replace-all': 'error',
  '@unicorn/prefer-string-slice': 'error',
  '@unicorn/prefer-string-trim-start-end': 'error',
  '@unicorn/prefer-ternary': 'warn',
  '@unicorn/require-array-join-separator': 'error',
  '@unicorn/require-number-to-fixed-digits-argument': 'error',
  '@unicorn/template-indent': 'error',
  '@unicorn/throw-new-error': 'error',
};
const tsRulesForCommonLib = { 
  ...tsRules, 
  '@unicorn/filename-case': ['error', {
    'case': 'kebabCase',
    'ignore': [
      '^relation--',
      '^\d\d\d\d\d\d',
      /^[0-9]{13}-/,
      /(.*)--(.*)/,
    ],
  }],
};

module.exports = [
  oxlint.configs['flat/recommended'],
  {
    files: ['src/**/*.ts'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/api-common/**',
      '**/i18n.*',
    ],
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        EXPERIMENTAL_useProjectService: {
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20_000,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsLint,
      '@stylistic/ts': stylisticTs,
      '@stylistic/js': stylisticJs,
      '@unicorn': eslintPluginUnicorn,
    },
    rules: tsRules,
  },
  {
    files: ['src/lib/api-common/**/*.ts'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'node_modules/**',
      'dist/**',
      '**/i18n.*',
    ],
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        EXPERIMENTAL_useProjectService: {
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20_000,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsLint,
      '@stylistic/ts': stylisticTs,
      '@stylistic/js': stylisticJs,
      '@unicorn': eslintPluginUnicorn,
    },
    rules: tsRulesForCommonLib,
  },
  {
    files: ['**/*.js'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/i18n.*',
    ],
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        EXPERIMENTAL_useProjectService: {
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20_000,
        },
      },
    },
    plugins: {
      '@typescript-eslint': tsLint,
      '@stylistic/js': stylisticJs,

      '@unicorn': eslintPluginUnicorn,
    },
    rules: {
     'no-unused-vars': 'off',
      '@typescript-eslint/no-mixed-enums': 'error',
      '@typescript-eslint/no-unsafe-enum-comparison': 'error',
      '@typescript-eslint/prefer-enum-initializers': 'error',
      '@typescript-eslint/prefer-literal-enum-member': 'error',
      '@typescript-eslint/adjacent-overload-signatures': 'error',
      '@typescript-eslint/no-array-delete': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      //   '@typescript-eslint/no-misused-promises': [
      //     'error',
      //     {
      //       'checksConditionals': true,
      //       'checksSpreads': true,
      //       'checksVoidReturn': true
      //     }
      //   ],

      // FORMATTING RULES
      '@stylistic/js/block-spacing': 'error',
      '@stylistic/js/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@stylistic/js/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/js/comma-spacing': ['error', { before: false, after: true }],
      '@stylistic/js/function-call-spacing': ['error', 'never'],
      '@stylistic/js/key-spacing': ['error', { beforeColon: false, afterColon: true }],
      '@stylistic/js/keyword-spacing': ['error', { before: true, after: true }],
      '@stylistic/js/no-extra-semi': 'error',
      '@stylistic/js/object-curly-spacing': ['error', 'always'],
      '@stylistic/js/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
      '@stylistic/js/quote-props': ['error', 'as-needed'],
      '@stylistic/js/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      '@stylistic/js/semi': 'error',
      '@stylistic/js/space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      '@stylistic/js/space-infix-ops': 'error',

      '@stylistic/js/dot-location': ['error', 'property'],
      // https://github.com/sindresorhus/eslint-plugin-unicorn/tree/main/docs/rules
      '@unicorn/catch-error-name': [
        'error',
        {
          ignore: [
            '^err\\d*$',
            '^error\\d*$',
            /^ignore/i,
          ],
        },
      ],
      '@unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          'ignore': [
            '^relation--',
            '^\d\d\d\d\d\d',
            /^[0-9]{13}-/,
            /--/,
          ],
        },
      ],
      '@unicorn/new-for-builtins': 'error',
      '@unicorn/no-abusive-eslint-disable': 'error',
      '@unicorn/no-array-for-each': 'warn',
      '@unicorn/no-array-method-this-argument': 'error',
      '@unicorn/no-array-push-push': 'warn',
      '@unicorn/no-await-in-promise-methods': 'error',
      '@unicorn/no-for-loop': 'warn',
      '@unicorn/no-instanceof-array': 'error',
      '@unicorn/no-new-buffer': 'error',
      '@unicorn/no-static-only-class': 'error',
      '@unicorn/no-thenable': 'error',
      '@unicorn/no-typeof-undefined': 'error',
      '@unicorn/no-unnecessary-await': 'error',
      '@unicorn/no-unnecessary-polyfills': [
        'error',
        {
          targets: 'node > 16',
        },
      ],
      '@unicorn/no-unreadable-iife': 'error',
      '@unicorn/no-useless-fallback-in-spread': 'error',
      '@unicorn/no-useless-length-check': 'error',
      '@unicorn/no-useless-promise-resolve-reject': 'error',
      '@unicorn/no-useless-spread': 'error',
      '@unicorn/numeric-separators-style': ['error',
        {
          onlyIfContainsSeparator: false,
          number: { minimumDigits: 5, groupLength: 3 },
          octal: { minimumDigits: 0, groupLength: 4 },
          hexadecimal: { minimumDigits: 0, groupLength: 4 },
          binary: { minimumDigits: 0, groupLength: 8 },
        },
      ],
      '@unicorn/prefer-array-find': 'error',
      '@unicorn/prefer-array-flat': 'error',
      '@unicorn/prefer-array-flat-map': 'error',
      '@unicorn/prefer-array-index-of': 'error',
      '@unicorn/prefer-array-some': 'warn',
      '@unicorn/prefer-at': 'error',
      '@unicorn/prefer-code-point': 'error',
      '@unicorn/prefer-export-from': 'error',
      '@unicorn/prefer-includes': 'error',
      '@unicorn/prefer-json-parse-buffer': 'error',
      '@unicorn/prefer-logical-operator-over-ternary': 'warn',
      '@unicorn/prefer-math-trunc': 'error',
      '@unicorn/prefer-modern-math-apis': 'error',
      // '@unicorn/prefer-module': 'error',
      '@unicorn/prefer-negative-index': 'error',
      '@unicorn/prefer-node-protocol': 'error',
      '@unicorn/prefer-number-properties': 'error',
      '@unicorn/prefer-prototype-methods': 'error',
      '@unicorn/prefer-regexp-test': 'error',
      '@unicorn/prefer-set-has': 'error',
      '@unicorn/prefer-set-size': 'error',
      '@unicorn/prefer-spread': 'error',
      '@unicorn/prefer-string-replace-all': 'error',
      '@unicorn/prefer-string-slice': 'error',
      '@unicorn/prefer-string-trim-start-end': 'error',
      '@unicorn/prefer-ternary': 'error',
      '@unicorn/require-array-join-separator': 'error',
      '@unicorn/require-number-to-fixed-digits-argument': 'error',
      '@unicorn/template-indent': 'error',
      '@unicorn/throw-new-error': 'error',
    },
  },
];
