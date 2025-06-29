import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import noRawColors from "./eslint-plugin/no-raw-colors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      "theme": {
        rules: {
          "no-raw-colors": noRawColors,
        },
      },
    },
    rules: {
      "theme/no-raw-colors": "error",
    },
  },
];

export default eslintConfig;
