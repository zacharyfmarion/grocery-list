const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "node_modules/",
      ".expo/",
      ".pnp.cjs",
      "dist/",
      "babel.config.js",
      "metro.config.js",
      "tailwind.config.js",
      "eslint.config.js",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
