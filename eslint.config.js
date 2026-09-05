const eslint = require("@eslint/js");
const typescriptEslint = require("@typescript-eslint/eslint-plugin");

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
    ...typescriptEslint.configs["flat/recommended"].map(config => ({
        ...config,
        files: typescriptFiles,
    })),
    {
        files: typescriptFiles,
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "no-useless-assignment": "off",
            "preserve-caught-error": "off",
        },
    },
];
