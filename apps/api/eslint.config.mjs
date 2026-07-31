// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Destructuring a field solely to exclude it from a `...rest` spread
      // (e.g. word-battle.service.ts's sanitizeGameForSeat stripping the
      // Boggle solution list before sending state to the client) is a real,
      // intentional pattern — not dead code, so don't flag the excluded var.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      // A controller must never trust a client-supplied x-user-id header for
      // identity (it's trivially spoofable) — identity comes only from
      // @UseGuards(JwtAuthGuard) + req.user.userId. Two independent
      // controllers (video, eat) shipped this exact bug before it was
      // caught by manual audit; this rule catches it at lint time instead.
      // See docs/ARCHITECTURE_RECOMMENDATIONS.md #1.
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='Headers'] > Literal[value='x-user-id']",
          message:
            "Don't trust the client-supplied x-user-id header for identity — it can be spoofed by any caller. Use @UseGuards(JwtAuthGuard) and read req.user.userId instead.",
        },
      ],
    },
  },
);
