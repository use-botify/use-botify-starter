/** @type {import("prettier").Config} */
const config = {
  endOfLine: "lf",
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 80,
  importOrder: [
    "<BUILTIN_MODULES>",
    "",
    "<THIRD_PARTY_MODULES>",
    "",
    "^@botify/(.*)$",
    "^@/lib/(.*)$",
    "^@/schema/(.*)$",
    "^@/config/(.*)$",
    "^@/core/(.*)$",
    "^@/features/(.*)$",
    "^@/utils/(.*)$",
    "^@/templates(.*)$",
    "^@/(.*)$",
    "",
    "^[./]",
  ],
  importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
  importOrderTypeScriptVersion: "5.0.0",
  plugins: ["@ianvs/prettier-plugin-sort-imports"],
}

export default config