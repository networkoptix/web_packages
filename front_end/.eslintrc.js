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
    root: true,
    /* Overrides should be ordered by range of files affected, then by
    range of code affected, from general to specific.

    For example, package specific linting rules like eslint-plugin-rxjs which
    affect all TS files but only specific code should go below the
    override for @typescript-eslint, but above the override for test files,
    which only affects specific TS files. */
    overrides: [
        {
            files: ['*.js', '*.ts'],
            extends: ['standard'],
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
            },
            env: {
                node: true,
                browser: true,
                jasmine: true,
            },
            plugins: [
                'import',
                // 'node',
                // 'promise',
            ],
            rules: {
                'accessor-pairs': 'off',
                'array-bracket-newline': ['error', 'consistent'],
                'array-element-newline': ['error', 'consistent'],
                'arrow-parens': ['error', 'as-needed'],
                camelcase: ['error', {
                    properties: 'never',
                    ignoreDestructuring: true,
                }],
                'comma-dangle': ['error', 'only-multiline'],
                eqeqeq: ['error', 'always'],
                indent: ['error', 4, {
                    SwitchCase: 1,
                    ignoredNodes: [
                        'TemplateLiteral *',
                        /* Don't enforce indent inside template literals */
                        'PropertyDefinition[decorators] Identifier',
                        /* Incorrectly indents class property with decorator on
                        preceding line */
                    ],
                }],
                'multiline-ternary': 'off',
                'no-case-declarations': 'off',
                'no-dupe-else-if': 'error',
                'no-extra-semi': 'error',
                'no-mixed-operators': 'off',
                'no-multi-assign': 'error',
                'no-return-await': 'error',
                'no-unused-vars': ['error', {
                    varsIgnorePattern: '^_',
                    args: 'none',
                    // argsIgnorePattern: '^_',
                    // TODO: Restore args
                }],
                'no-use-before-define': ['error', {
                    functions: true,
                    classes: true,
                    variables: true,
                }],
                'no-useless-escape': 'off',
                'object-shorthand': 'error',
                'prefer-promise-reject-errors': 'off',
                'prefer-regex-literals': 'off',
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
            },
        },
        {
            /* This override is setup for all TS files */
            files: ['*.ts'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                project: './tsconfig.json',
                createDefaultProgram: true,
            },
            plugins: ['nx', '@typescript-eslint'],
            rules: {
                'no-undef': 'off', // TS incompatible

                'no-useless-constructor': 'off',
                'nx/no-useless-constructor': 'error',
                'nx/only-export-injectable': 'error',

                '@typescript-eslint/ban-types': ['error', {
                    extendDefaults: false, // TODO: Restore
                    types: {
                        SimpleChanges: {
                            message: [
                                'Angular\'s `SimpleChanges` is not type-safe.',
                                'Use the `NgChanges` utility type instead.',
                            ].join('\n')
                        }
                    },
                }],
                ...tsExtension('brace-style', [
                    'error',
                    '1tbs',
                    { allowSingleLine: true }
                ]),
                ...tsExtension('comma-dangle', ['error', 'only-multiline']),
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
                ...tsExtension('no-extra-semi'),
                ...tsExtension('no-implied-eval'),
                ...tsExtension('no-redeclare', ['error', {
                    builtinGlobals: false
                }]),
                ...tsExtension('no-throw-literal'),
                '@typescript-eslint/no-unnecessary-type-assertion': 'error',
                ...tsExtension('no-use-before-define', ['error', {
                    functions: true,
                    classes: true,
                    // Will false positive on useExisting: forwardRef
                    variables: true,
                    enums: true,
                    typedefs: true,
                    ignoreTypeReferences: false,
                }]),
                ...tsExtension('no-unused-expressions', ['error', {
                    allowShortCircuit: true,
                    allowTernary: true,
                    allowTaggedTemplates: true
                }]),
                ...tsExtension('no-unused-vars', ['error', {
                    varsIgnorePattern: '^_',
                    args: 'none',
                    // argsIgnorePattern: '^_',
                }]),
                ...tsExtension('object-curly-spacing', ['error', 'always']),
                '@typescript-eslint/prefer-includes': 'error',
                // Note: @ts-ignore should still be used for false
                // positives on TS warnings
                '@typescript-eslint/prefer-ts-expect-error': 'error',
                ...tsExtension('semi'),
                ...tsExtension('space-before-blocks', ['error', 'always']),
                ...tsExtension('space-before-function-paren', ['error', {
                    anonymous: 'always',
                    named: 'never',
                    asyncArrow: 'always'
                }]),
                ...tsExtension('space-infix-ops'),
            },
        },
        {
            /* This override is for folders/files that have been fully typed.

            It should be kept right under the main TS override since
            the number of files affected will grow as files are typed until
            the entire codebase is typed, at which point it can be merged
            into the main TS override. */
            files: ['*.ts'],
            excludedFiles: require('./type-lint-blacklist'),
            extends: ['plugin:@typescript-eslint/recommended'],
            rules: {
                'nx/explicit-angular-boundary-types': 'error',
                'nx/no-untyped-arg': 'error',
                'nx/no-untyped-init': 'error',
                'nx/no-untyped-subject': 'error',

                '@typescript-eslint/ban-types': ['error', {
                    extendDefaults: true,
                    types: {
                        SimpleChanges: {
                            message: [
                                'Angular\'s `SimpleChanges` is not type-safe.',
                                'Use the `NgChanges` utility type instead.',
                            ].join('\n')
                        }
                    },
                }],
                '@typescript-eslint/explicit-function-return-type': [
                    'error',
                    { allowExpressions: true }
                ],
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-explicit-any': 'error',
                '@typescript-eslint/no-inferrable-types': 'off',
                '@typescript-eslint/no-non-null-assertion': 'error',

                // Re-override recommendeded rule config
                '@typescript-eslint/no-unused-vars': ['error', {
                    varsIgnorePattern: '^_',
                    args: 'none',
                    // argsIgnorePattern: '^_',
                }],
            },
        },
        {
            files: ['*.ts'],
            extends: [
                // 'plugin:@angular-eslint/recommended',
                // 'plugin:@angular-eslint/template/process-inline-templates',
            ],
            plugins: ['@angular-eslint'],
            rules: {},
        },
        {
            files: ['*.ts'],
            plugins: ['rxjs'],
            extends: ['plugin:rxjs/recommended'],
            rules: {
                'rxjs/no-nested-subscribe': 'off', // TODO: re-factor
                'rxjs/no-async-subscribe': 'off', // not sure if this should be implemented - TT
                'rxjs/no-ignored-takewhile-value': 'off', // not sure if this should be implemented (only one place) - TT
                'rxjs/no-implicit-any-catch': 'off', // not sure if this should be implemented - TT
                'rxjs/no-unbound-methods': 'off', // we'll not fix this
            },
        },
        {
            files: ['*.ts'],
            plugins: ['ngrx'],
            extends: ['plugin:ngrx/recommended'],
            rules: {},
        },
        {
            files: ['*.spec.ts'],
            rules: {
                '@typescript-eslint/dot-notation': 'off',
            }
        },
        {
            /* Allow top-down organization in types files */
            files: ['*types.ts', 'app/src/services/nx-config/base-config.ts'],
            rules: {
                '@typescript-eslint/no-use-before-define': ['error', {
                    enums: true,
                    typedefs: true,
                    ignoreTypeReferences: true,
                }],
            }
        },
        {
            files: ['*.component.html'],
            // extends: ['plugin:@angular-eslint/template/recommended'],
            parser: '@angular-eslint/template-parser',
            plugins: ['@angular-eslint/template'],
            rules: {}
        },
        {
            files: ['*.component.html'],
            excludedFiles: ['*inline-template-*.component.html'],
            // extends: ['plugin:prettier/recommended'],
            plugins: ['prettier'],
            rules: {}
        },
    ]
};
