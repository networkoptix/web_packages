const { showOptionalWarnings } = require('./eslintrc-options.json');
const nonControlFlowTemplates = require('./non-control-flow-templates');
const typeLintErrorCount = require('./type-lint-error-count');

const lintTaskRunner = process.env.NX_TASK_TARGET_TARGET === 'lint';

const onlyEditor = (value, overrideShowOptional = false) =>
    lintTaskRunner || ![showOptionalWarnings, overrideShowOptional].some(Boolean) ? 'off' : value;

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
            files: ['*.?(m)js', '*.ts'],
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
            plugins: ['import'],
            rules: {
                'accessor-pairs': 'off',
                camelcase: 'off',

                curly: ['error', 'all'],
                eqeqeq: ['error', 'always'],
                'multiline-ternary': 'off',
                'no-case-declarations': 'off',
                'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
                'no-dupe-else-if': 'error',
                'no-mixed-operators': 'off',
                'no-multi-assign': 'error',
                'no-return-await': 'error',
                'no-unused-expressions': [
                    'error',
                    {
                        allowShortCircuit: false,
                        allowTernary: false,
                        allowTaggedTemplates: false,
                    },
                ],
                'no-unused-vars': [
                    'error',
                    {
                        varsIgnorePattern: '^_',
                        args: 'none',
                        // argsIgnorePattern: '^_',
                        // TODO: Restore args
                    },
                ],
                'no-use-before-define': [
                    'error',
                    {
                        functions: true,
                        classes: true,
                        variables: true,
                    },
                ],
                'no-useless-escape': 'off',
                'object-shorthand': 'error',
                'prefer-promise-reject-errors': 'off',
                'prefer-regex-literals': 'off',

                'import/no-default-export': 'error',

                // import plugin handles paths, eslint base handles members
                'import/order': [
                    'error',
                    {
                        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                        pathGroups: Object.keys(
                            require('./tsconfig.base.json').compilerOptions.paths,
                        )
                            // We're patching ngx-translate core
                            .filter(path => path !== '@ngx-translate/core')
                            .map(path => ({
                                /* Turn single asterisk into double asterisk */
                                pattern: path.endsWith('*') ? `${path}*` : path,
                                group: 'internal',
                            })),
                        pathGroupsExcludedImportTypes: ['internal'],
                        'newlines-between': 'always',
                        alphabetize: { order: 'asc' },
                    },
                ],
            },
        },
        {
            files: ['*.?(m)js', '*.ts'],
            excludedFiles: ['libs/components/**', 'libs/features/**'],
            rules: {
                'sort-imports': [
                    'error',
                    {
                        ignoreCase: true,
                        ignoreDeclarationSort: true,
                    },
                ],
            },
        },
        {
            files: ['*.?(m)js'],
            rules: {
                'no-console': 'off', // Assuming that all JS is scripts or config
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

                '@typescript-eslint/ban-types': [
                    'error',
                    {
                        extendDefaults: false, // TODO: Restore
                        types: {
                            SimpleChanges: {
                                message: [
                                    "Angular's `SimpleChanges` is not type-safe.",
                                    'Use the `NgChanges` utility type instead.',
                                ].join('\n'),
                            },
                        },
                    },
                ],
                ...tsExtension('dot-notation', ['error', { allowKeywords: true }]),
                // Rule has been updated so that exceptAfterSingleLine isn't a valid option anymore. It's also being removed from typescript-eslint
                ...tsExtension('lines-between-class-members', 'off'),
                ...tsExtension('no-array-constructor'),
                ...tsExtension('no-dupe-class-members'),
                ...tsExtension('no-implied-eval'),
                ...tsExtension('no-redeclare', [
                    'error',
                    {
                        builtinGlobals: false,
                    },
                ]),
                ...tsExtension('no-throw-literal'),
                '@typescript-eslint/no-unnecessary-type-assertion': onlyEditor('warn'),
                ...tsExtension('no-use-before-define', [
                    'error',
                    {
                        functions: true,
                        classes: true,
                        variables: true,
                        enums: true,
                        typedefs: true,
                        ignoreTypeReferences: false,
                    },
                ]),
                ...tsExtension('no-unused-expressions', [
                    'error',
                    {
                        allowShortCircuit: false,
                        allowTernary: false,
                        allowTaggedTemplates: false,
                    },
                ]),
                ...tsExtension('no-unused-vars', [
                    'error',
                    {
                        varsIgnorePattern: '^_',
                        args: 'none',
                        // argsIgnorePattern: '^_',
                    },
                ]),
                '@typescript-eslint/prefer-includes': 'error',
            },
        },
        {
            /* This override is for folders/files that have been fully typed.

            It should be kept right under the main TS override since
            the number of files affected will grow as files are typed until
            the entire codebase is typed, at which point it can be merged
            into the main TS override. */
            files: ['*.ts'],
            excludedFiles: [
                // Development stopped
                'libs/features/dashboard/**',
                '**/*widget*/**',

                // Unused
                'libs/features/debug/**',

                // Replaced, but keep for reference
                'libs/dialogs/merge/merge.component.ts',
                'libs/dialogs/merge/stateForMergeDialog.ts',
                'libs/dialogs/merge/stateMachine.ts',

                // Deprecated
                'libs/*/process*/**',

                ...Object.keys(typeLintErrorCount),
            ],
            extends: ['plugin:@typescript-eslint/recommended'],
            rules: {
                'nx/explicit-angular-boundary-types': 'error',
                'nx/no-untyped-arg': 'error',
                'nx/no-untyped-init': 'error',
                'nx/no-untyped-subject': 'error',
                '@typescript-eslint/ban-types': [
                    'error',
                    {
                        extendDefaults: true,
                        types: {
                            SimpleChanges: {
                                message: [
                                    "Angular's `SimpleChanges` is not type-safe.",
                                    'Use the `NgChanges` utility type instead.',
                                ].join('\n'),
                            },
                        },
                    },
                ],
                '@typescript-eslint/explicit-function-return-type': [
                    'error',
                    { allowExpressions: true },
                ],
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-empty-interface': 'off',
                '@typescript-eslint/no-explicit-any': 'error',
                '@typescript-eslint/no-inferrable-types': 'off',

                // Re-override recommendeded rule config
                '@typescript-eslint/no-unused-vars': [
                    'error',
                    {
                        varsIgnorePattern: '^_',
                        args: 'none',
                        // argsIgnorePattern: '^_',
                    },
                ],
            },
        },
        {
            files: ['*.ts'],
            extends: ['plugin:@angular-eslint/recommended'],
            plugins: ['@angular-eslint'],
            rules: {
                // TODO: Evaluate whether we want these or not
                '@angular-eslint/component-class-suffix': 'off',
                '@angular-eslint/contextual-lifecycle': 'off',
                '@angular-eslint/directive-class-suffix': 'off',
                '@angular-eslint/no-empty-lifecycle-method': 'off',
                '@angular-eslint/no-host-metadata-property': 'off',
                '@angular-eslint/no-input-rename': 'off',
                '@angular-eslint/no-output-native': 'off',
                '@angular-eslint/no-output-on-prefix': 'off',
                '@angular-eslint/use-lifecycle-interface': 'off',
            },
        },
        {
            files: ['*.ts'],
            extends: ['plugin:@angular-eslint/template/process-inline-templates'],
            excludedFiles: ['*.spec.ts'],
        },
        {
            // Temporary override for applying @angular-eslint rules
            files: ['*.ts'],
            excludedFiles: [],
            rules: {
                '@angular-eslint/component-selector': [
                    'error',
                    {
                        type: ['element', 'attribute'],
                        prefix: 'nx',
                        style: 'kebab-case',
                    },
                ],
            },
        },
        {
            files: ['*.ts'],
            plugins: ['rxjs'],
            extends: ['plugin:rxjs/recommended'],
            rules: {
                'rxjs/no-nested-subscribe': onlyEditor('warn'), // TODO: re-factor
                'rxjs/no-async-subscribe': onlyEditor('warn'), // not sure if this should be implemented - TT
                'rxjs/no-ignored-takewhile-value': onlyEditor('warn'), // not sure if this should be implemented (only one place) - TT
                'rxjs/no-implicit-any-catch': onlyEditor('warn'), // not sure if this should be implemented - TT
                'rxjs/no-unbound-methods': onlyEditor('error'),
                'rxjs/no-unsafe-takeuntil': onlyEditor('error'),
                'rxjs/no-unsafe-subject-next': onlyEditor('error'),
                'rxjs/no-ignored-replay-buffer': 'warn',
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
            },
        },
        {
            /* Allow top-down organization in types files */
            files: ['*types.ts', '*.d.ts', '**/nx-config/base-config.ts'],
            rules: {
                '@typescript-eslint/no-use-before-define': [
                    'error',
                    {
                        enums: true,
                        typedefs: true,
                        ignoreTypeReferences: true,
                    },
                ],
            },
        },
        {
            // Don't need to enforce some rules for internal sandbox
            files: ['**/sandbox/**/*.ts'],
            rules: {
                'no-console': 'off',
                '@angular-eslint/component-class-suffix': 'off',
                '@angular-eslint/component-selector': 'off',
                '@angular-eslint/directive-class-suffix': 'off',
            },
        },
        {
            // Jest configs use default export
            files: ['jest.config.ts'],
            rules: {
                'import/no-default-export': 'off',
            },
        },
        {
            files: ['*.?(m)js', '*.ts'],
            excludedFiles: [],
            extends: ['plugin:prettier/recommended'],
            plugins: ['prettier'],
            rules: {
                // https://github.com/prettier/eslint-config-prettier#curly
                curly: ['error', 'all'],
            },
        },
        {
            files: ['*.component.html'],
            parser: '@angular-eslint/template-parser',
            plugins: ['@angular-eslint/template'],
            rules: {},
            // Not going to activate any template rules, they seem
            // buggy on fix. Keeping the override for the parser.
        },
        {
            files: ['*.component.html'],
            plugins: ['nx'],
            rules: {
                'nx/template/translate-contents': ['error', ['svg-icon']],
            },
        },
        {
            files: ['*.component.html'],
            excludedFiles: [
                '**/debug/debug.component.html',
                '**/email-notifications/email-notifications.component.html',
                '**/layout/layout.component.html',
                '**/push-notifications/push-notifications.component.html',
                '**/sandbox/**/*.html',
                'libs/dialogs/nx-modal-template.component.html',
                // Not required for internal/testing components
            ],
            rules: {
                'nx/template/no-untranslated': 'error',
            },
        },
        {
            files: ['*.component.html'],
            excludedFiles: ['*inline-template-*.component.html'],
            extends: ['plugin:prettier/recommended'],
            plugins: ['prettier'],
            rules: {
                'prettier/prettier': [
                    'error',
                    {
                        parser: 'angular',
                    },
                ],
            },
        },
        {
            plugins: ['@nx'],
            files: ['*.ts'],
            rules: {
                '@nx/enforce-module-boundaries': [
                    // Only show warnings within editor for now
                    // We have a lot of circular dependencies to fix
                    // There are also issues where we import from non-lib modules
                    onlyEditor('warn'),
                    {
                        allow: [],
                        depConstraints: [
                            {
                                sourceTag: 'apps:*',
                                onlyDependOnLibsWithTags: ['libs:*', 'features:*'],
                            },
                            {
                                sourceTag: 'features:*',
                                onlyDependOnLibsWithTags: ['libs:*'],
                            },
                            {
                                sourceTag: 'libs:*',
                                onlyDependOnLibsWithTags: ['libs:*'],
                            },
                        ],
                    },
                ],
            },
        },

        /* Only allow non-$$-suffixed signals in components exclusively using control flow,
        since old directives (*ngIf, *ngFor, etc.) cannot detect constant conditions while
        control flow can. New components should be only using control flow. */
        {
            files: nonControlFlowTemplates.map(t => t.replace('.html', '.ts')),
            rules: {
                'nx/signal-naming-convention': 'error',
            },
        },
        {
            files: ['*.component.html'],
            excludedFiles: nonControlFlowTemplates.map(t =>
                t.endsWith('.html') ? t : `${t}/*inline-template-*.component.html `,
            ),
            rules: {
                '@angular-eslint/template/prefer-control-flow': 'error',
            },
        },
    ],
};
