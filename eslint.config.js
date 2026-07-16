import stylistic from "@stylistic/eslint-plugin";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";

export default [
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
            },
            globals: globals.node,
        },
        plugins: {
            "@stylistic": stylistic,
            "@typescript-eslint": typescriptEslint,
            "simple-import-sort": simpleImportSort,
            "unicorn": eslintPluginUnicorn,
        },
        rules: {
            "@stylistic/brace-style": ["error", "allman", { allowSingleLine: true }],
            "@stylistic/comma-dangle": ["error", "always-multiline"],
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/indent": ["error", 4],
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/quotes": ["error", "double"],
            "curly": "error",
            "eqeqeq": "error",
            "no-dupe-keys": "error",
            "no-throw-literal": "error",
            "semi": "error",
            "simple-import-sort/exports": "error",
            "simple-import-sort/imports": "error",
            "unicorn/filename-case": ["error", { case: "kebabCase" }],
        },
    },
    {
        ignores: ["dist", "node_modules"],
    },
];
