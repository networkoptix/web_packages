module.exports = {
    overrides: [
        {
            files: ['src/tests/**/*.ts'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off'
            }
        }
    ]
};
