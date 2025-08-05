import stylistic from "@stylistic/eslint-plugin";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";

export default [
    // Base configuration for all TypeScript files
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: 2022,
                sourceType: "module",
            },
            globals: globals.node,
        },
        plugins: {
            "@typescript-eslint": typescriptEslint,
            "@stylistic": stylistic,
            "simple-import-sort": simpleImportSort,
            "react-hooks": reactHooks,
            "unicorn": eslintPluginUnicorn,
        },
        rules: {
            "curly": "warn",
            "eqeqeq": "warn",
            "no-throw-literal": "warn",
            "semi": "warn",
            "no-dupe-keys": "error",

            "@typescript-eslint/naming-convention": ["warn", {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            }],

            "@stylistic/brace-style": ["error", "allman", { allowSingleLine: true }],
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/comma-dangle": ["error", "always-multiline"],
            "@stylistic/indent": ["error", 4],
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/object-curly-spacing": ["error", "always"],

            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",

            ...reactHooks.configs["recommended-latest"].rules,

            "unicorn/filename-case": ["error", { case: "kebabCase" }],
        },
    },
    // Global ignores
    {
        ignores: [
            "dist",
            "node_modules",
            "patches",
            ".git",
            "**/dist/**",
            "**/node_modules/**",
        ],
    },
];
