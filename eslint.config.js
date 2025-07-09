import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import stylistic from "@stylistic/eslint-plugin";

export default [
    {
        files: ["src/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: 2020,
                sourceType: "module",
            },
            globals: globals.node,
        },
        plugins: {
            unicorn: eslintPluginUnicorn,
            "@stylistic": stylistic
        },
        rules: {
            "unicorn/filename-case": ["error", { case: "kebabCase" }],
            "@stylistic/brace-style": [2, "allman", { allowSingleLine: true }],
            "@stylistic/quotes": [2, "double"]
        },
    },
];
