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
    overrides: [
        {
            /* This override is setup for all TS files */
            files: ['*.ts'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                project: './tsconfig.json',
                createDefaultProgram: true,
            },
            plugins: ['nx', '@typescript-eslint', 'ngrx'],
            rules: {
                'no-useless-constructor': 'off',
                'nx/no-useless-constructor': 'error',
                'nx/only-export-injectable': 'error',
            }
        },
        {
            /* This override is for folders/files that have been fully typed.
            This should eventually be merged with the other TS overrides. */
            files: [
                'app/src/components/search/**/*.ts',
                'app/src/components/dropdowns/generic/**/*.ts',
                'app/src/dialogs/create-system-group/**/*.ts',
                'app/src/dialogs/move-system-to-group/**/*.ts',
                'app/src/dialogs/system-group-settings/**/*.ts',
                'app/src/menu/**/*.ts',
                'app/src/pages/systems/groups/**/*.ts',
                'app/src/pipes/**/*.ts',
                'app/src/store/**/*.ts',
            ],
            extends: [
                'plugin:@typescript-eslint/eslint-recommended',
                'plugin:@typescript-eslint/recommended',
            ],
            rules: {
                'nx/explicit-input-output-types': 'error',
                'nx/no-untyped-init': 'error',

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
                '@typescript-eslint/explicit-module-boundary-types': 'error',
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-explicit-any': 'error',
                '@typescript-eslint/no-inferrable-types': 'off',
                '@typescript-eslint/no-non-null-assertion': 'error',
                '@typescript-eslint/no-unused-vars': 'off',
            },
        },
        {
            /* This override is also for all TS files */
            files: ['*.ts'],
            extends: ['plugin:ngrx/recommended'],
            rules: {
                'no-undef': 'off', // TS incompatible

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
            files: ['*.spec.ts'],
            rules: {
                '@typescript-eslint/dot-notation': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/no-unused-vars': ['error', {
                    varsIgnorePattern: '(^_)|(component)|(fixture)|(el)',
                    args: 'none',
                    // argsIgnorePattern: '^_',
                }],
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
    ]
};
