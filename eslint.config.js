import js from '@eslint/js'
import globals from 'globals'

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        foundry: 'readonly',
        game: 'readonly',
        quench: 'readonly',
        Hooks: 'readonly',
        CONFIG: 'readonly',
        Actor: 'readonly',
        Item: 'readonly',
        CONST: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['webpack.config.js', 'fvtt.config.js', 'fvtt.config.example copy.js', 'foundry-cypress.js', 'cypress.config.js', 'cypress.config.ci.js'],
    languageOptions: {
      globals: globals.node
    }
  },
  {
    files: ['cypress/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.mocha,
        cy: 'readonly',
        Cypress: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly'
      }
    }
  },
  { ignores: ['build/**', 'node_modules/**'] }
]
