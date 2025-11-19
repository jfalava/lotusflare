import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...typescriptEslint.configs.recommended,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    "node_modules/**",
    ".next/**",
    ".open-next/**",
    "cloudflare-env.d.ts",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    plugins: {
      "@typescript-eslint": typescriptEslint.plugin,
    },
    rules: {
      "react/no-unescaped-entities": 0,
      "@next/next/no-img-element": 0,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
