const eslint = require("@eslint/js");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const typescriptParser = require("@typescript-eslint/parser");

const typescriptFiles = ["**/*.ts"];

module.exports = [
    {
        ignores: [
            "test/**",
            "out/**",
            "node_modules/**",
            "scripts/**",
            "resources/**",
            "webpack.config.js",
            "dist/**",
            "eslint.config.js",
        ],
    },
    {
        linterOptions: {
            reportUnusedDisableDirectives: false,
        },
    },
    eslint.configs.recommended,
    {
        files: typescriptFiles,
        languageOptions: {
            parser: typescriptParser,
        },
        plugins: {
            "@typescript-eslint": typescriptEslint,
        },
        rules: {
            ...typescriptEslint.configs["eslint-recommended"].overrides[0].rules,
            ...typescriptEslint.configs.recommended.rules,
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "no-useless-assignment": "off",
            "preserve-caught-error": "off",
        },
    },
];
