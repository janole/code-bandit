import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";
import eslintPluginUnicorn from "eslint-plugin-unicorn";

export default [
    {
        ...stylistic.configs.customize({
            indent: 4,
            braceStyle: "allman",
            quotes: "double",
            semi: true,
            jsx: true,
            // ...
        }),
        files: ["source/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    },
    {
        files: ["source/**/*"],
        languageOptions: {
            globals: globals.builtin,
        },
        plugins: {
            unicorn: eslintPluginUnicorn,
        },
        rules: {
            "unicorn/filename-case": [
                "error",
                {
                    "case": "kebabCase"
                }
            ],
        },
    },
];
