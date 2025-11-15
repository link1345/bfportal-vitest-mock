import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

const ignoreConfig = {
    ignores: ["**/*.{js,mjs,cjs}"],
};


export default defineConfig([
    ignoreConfig,
    {
        files: ["test/src/**/*.{ts,mts,cts}"],
        languageOptions: {
            globals: globals.browser, parserOptions: {
                "ecmaVersion": "latest",
                "sourceType": "module",
                parser: "@typescript-eslint/parser"
            },
        },
        "settings": {
            // ✅ 以下で import 解析をスキップしたいモジュールを列挙
            "import/ignore": ["^modlib$", "^mod$"],
        }
    },
    tseslint.configs.recommended,
]);