/**
 * https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/eslint-plugin#extension-rules
 *
 * "In some cases, ESLint provides a rule itself, but it doesn't support
 * TypeScript syntax; either it crashes, or it ignores the syntax, or it
 * falsely reports against it. In these cases, we create what we call an
 * extension rule; a rule within our plugin that has the same functionality,
 * but also supports TypeScript."
 *
 * @param {string} rule Rule name
 * @param {string | Array} value Rule value + options
 * @returns Object with JS rule turned off and TS rule activated (unpack this)
 */
function tsExtension(rule, value = 'error') {
    return {
        [rule]: 'off',
        [`@typescript-eslint/${rule}`]: value,
    };
}

module.exports = {
    extends: ['standard'],
    root: true,
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
    },
    env: {
        node: true,
        browser: true,
        jasmine: true,
    },
    plugins: [
        'import',
        'node',
        // 'promise',
    ],
    rules: {
        'accessor-pairs': 'off',
        'arrow-parens': ['error', 'as-needed'],
        'comma-dangle': ['error', 'only-multiline'],
        eqeqeq: ['error', 'always'],
        'handle-callback-err': 'off', // Deprecated
        indent: ['error', 4, {
            SwitchCase: 1,
            VariableDeclarator: 1,
            outerIIFEBody: 1,
            MemberExpression: 1,
            FunctionDeclaration: { parameters: 1, body: 1 },
            FunctionExpression: { parameters: 1, body: 1 },
            CallExpression: { arguments: 1 },
            ArrayExpression: 1,
            ObjectExpression: 1,
            ImportDeclaration: 1,
            flatTernaryExpressions: false,
            ignoreComments: false,
            ignoredNodes: ['TemplateLiteral *']
        }],
        'no-case-declarations': 'off',
        'no-dupe-else-if': 'error',
        'no-mixed-operators': 'off',
        'no-multi-spaces': 'off', // TODO: Restore
        'no-multi-assign': 'error',
        'no-negated-in-lhs': 'off', // Deprecated
        'no-path-concat': 'off', // Deprecated
        'no-return-await': 'error',
        'no-unused-vars': 'off', // TODO: Restore for non-components
        // ["error", { "vars": "all", "args": "none", "ignoreRestSiblings": true }],
        'no-use-before-define': 'off', // TODO: Restore
        // ['error', { functions: false, classes: false, variables: false }],
        'no-useless-constructor': 'off', // TODO: Restore
        'no-useless-escape': 'off',
        'prefer-promise-reject-errors': 'off',
        semi: ['error', 'always'],
        'space-before-function-paren': ['error', {
            anonymous: 'always',
            named: 'never',
            asyncArrow: 'always'
        }],

        'import/no-default-export': 'error',
        'import/order': ['error', {
            groups: [
                'builtin',
                'external',
                'internal',
                'parent',
                'sibling',
                'index'
            ],
            pathGroups: Object.keys(
                require('./tsconfig.json').compilerOptions.paths
            ).map(path => ({
                pattern: `${path}*`,
                /* Assuming that tsconfig paths end with single asterisk so
                that the pattern here will end with double asterisk */
                group: 'internal'
            })),
            pathGroupsExcludedImportTypes: ['internal'],
            'newlines-between': 'always',
            alphabetize: { order: 'asc' }
        }],

        'node/handle-callback-err': ['error', '^(err|error)$'],
        'node/no-path-concat': 'error',
    },
    overrides: [
        {
            /* This override is setup for all TS files */
            files: ['*.ts'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                project: './tsconfig.json',
                createDefaultProgram: true,
            },
            plugins: ['@typescript-eslint', 'ngrx'],
        },
        {
            /* This override is for folders/files that have been fully typed.
            This should eventually be merged with the other TS overrides. */
            files: [
                'app/src/components/search/**/*.ts',
                'app/src/dialogs/create-system-group/**/*.ts',
                'app/src/dialogs/move-system-to-group/**/*.ts',
                'app/src/dialogs/system-group-settings/**/*.ts',
                'app/src/menu/**/*.ts',
                'app/src/pages/systems/groups/**/*.ts',
                'app/src/store/**/*.ts',
            ],
            extends: [
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended',
            ],
            rules: {
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-inferrable-types': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
            },
        },
        {
            /* This override is also for all TS files */
            files: ['*.ts'],
            extends: ['plugin:ngrx/recommended'],
            rules: {
                'no-undef': 'off', // TS incompatible

                ...tsExtension('brace-style', [
                    'error',
                    '1tbs',
                    { allowSingleLine: true }
                ]),
                ...tsExtension('comma-spacing'),
                ...tsExtension('dot-notation', [
                    'error',
                    { allowKeywords: true }
                ]),
                ...tsExtension('func-call-spacing'),
                ...tsExtension('keyword-spacing'),
                ...tsExtension('lines-between-class-members', ['error', {
                    exceptAfterSingleLine: true
                }]),
                ...tsExtension('no-array-constructor'),
                ...tsExtension('no-dupe-class-members'),
                ...tsExtension('no-extra-parens', ['error', 'functions']),
                ...tsExtension('no-implied-eval'),
                ...tsExtension('no-redeclare', ['error', {
                    builtinGlobals: false
                }]),
                ...tsExtension('no-throw-literal'),
                ...tsExtension('no-unused-expressions', ['error', {
                    allowShortCircuit: true,
                    allowTernary: true,
                    allowTaggedTemplates: true
                }]),
                '@typescript-eslint/prefer-includes': 'error',
                ...tsExtension('semi'),
                ...tsExtension('space-before-function-paren', ['error', {
                    anonymous: 'always',
                    named: 'never',
                    asyncArrow: 'always'
                }]),
            },
        },
        {
            files: ['*.spec.ts'],
            rules: {
                '@typescript-eslint/dot-notation': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
            }
        },
    ]
};
