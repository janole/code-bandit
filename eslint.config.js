import eslintPluginUnicorn from "eslint-plugin-unicorn";
import globals from "globals";

export default [
    {
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