module.exports = {
    "env": {
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
    ],
    "overrides": [
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "project": ["./tsconfig.json"],
        "ecmaVersion": "latest",
    },
    "plugins": [
        "@typescript-eslint",
    ],
    "rules": {
        'no-fallthrough': 'off',
        'no-constant-condition': 'off',
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-non-null-assertion": "off",
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-this-alias': 'off',
        '@typescript-eslint/no-empty-function': 'off',
    },
}
