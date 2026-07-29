import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'audit-artifacts/**', 'test-results/**', '.agents/**', '.claude/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['.agents', '.agents/**', '**/.agents/**'],
              message: 'src/ may not reference .agents. Skills are resolved at compile time by tools/skill-compiler*; consume src/generated/*.json only.',
            },
            {
              group: ['scripts', 'scripts/**', '**/scripts/**'],
              message: 'src/ may not import from scripts/. Dev tooling is not a runtime dependency.',
            },
            {
              group: ['tools', 'tools/**', '**/tools/**'],
              message: 'src/ may not import from tools/. The skill compilers are dev/CI-only and never ship to the browser bundle.',
            },
          ],
          paths: [
            { name: 'fs', message: 'src/ is browser code and may not use Node fs. Filesystem access belongs in tools/skill-compiler only.' },
            { name: 'node:fs', message: 'src/ is browser code and may not use Node fs. Filesystem access belongs in tools/skill-compiler only.' },
            { name: 'path', message: 'src/ is browser code and may not use Node path. Filesystem access belongs in tools/skill-compiler only.' },
            { name: 'node:path', message: 'src/ is browser code and may not use Node path. Filesystem access belongs in tools/skill-compiler only.' },
          ],
        },
      ],
    },
  },
  {
    files: ['tools/**/*.ts', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
);
