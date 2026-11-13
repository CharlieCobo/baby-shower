import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    // Regla de arquitectura: solo la infraestructura importa el SDK de Firebase.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/infrastructure/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(firebase|@firebase)(/.*)?$',
              message:
                'Solo src/infrastructure puede importar Firebase; usa los puertos de application/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['*.config.{ts,js}', 'scripts/**', 'tests/rules/**', 'tests/e2e/**'],
    languageOptions: { globals: globals.node },
  },
  prettier,
)
