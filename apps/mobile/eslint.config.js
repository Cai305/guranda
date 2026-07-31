// Flat ESLint config for the mobile app — mirrors apps/api/eslint.config.mjs's
// intent (catch dead code and unsafe patterns continuously) using Expo's own
// base config, since apps/api's NestJS-specific typed rules don't apply here.
// Added after a manual `tsc --noUnusedLocals --noUnusedParameters` sweep
// found ~45 unused-code findings with nothing in place to catch new ones —
// see docs/ARCHITECTURE_RECOMMENDATIONS.md #7.
const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'android/*', 'ios/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { ignoreRestSiblings: true, argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // eslint-config-expo's React Compiler rules (react-hooks/*) and
    // react/no-unescaped-entities are enforced at 'error' by default and
    // flag ~150 pre-existing, working patterns across the app (e.g.
    // `useEffect(() => { load(); }, [load])`, a standard data-fetch-on-mount
    // pattern) — rewriting those is a real, separate refactor, not dead-code
    // cleanup. Downgraded to 'warn' so they stay visible without blocking
    // `npm run lint` on unrelated work; @typescript-eslint/no-unused-vars
    // above — the actual target of this config — stays at 'error'.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/use-memo': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
]);
