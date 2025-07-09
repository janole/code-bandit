import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";

export default [
    {
        ignores: ["dist/**", "node_modules/**"],
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
