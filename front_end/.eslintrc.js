/** Files that need to be typed */
const typeLintBlacklist = [
    /* Common */
    '**/_mocks/getSettings.mock.ts',
    '**/_mocks/helpers.test.ts',
    '**/test.ts',
    /* Components */
    '**/advanced-filter/advanced-filter.component.ts',
    '**/apply/apply.component.ts',
    '**/carousel/carousel.component.ts',
    '**/console-table/console-table.component.spec.ts',
    '**/console-table/console-table.component.ts',
    '**/console-table/console-table.component.types.ts',
    '**/console-table/table-data-source.ts',
    '**/alert/block-default.component.spec.ts',
    '**/developers-menu/developers-menu.component.ts',
    '**/active-system/active-system.component.ts',
    '**/drop-menu/drop-menu.component.ts',
    '**/drop-menu/navigation-tile/navigation-tile.component.ts',
    '**/injDropdown.ts',
    '**/language/language.component.ts',
    '**/nav-location/nav.component.ts',
    '**/dynamic-widget/dynamic-widget.component.ts',
    '**/dynamic-widget/register-widget.ts',
    '**/editable/editable.component.ts',
    '**/heading/editable-heading.component.ts',
    '**/email-input/email.component.ts',
    '**/external-video/external-video.component.ts',
    '**/footer/footer.component.ts',
    '**/header/header.component.ts',
    '**/main-button/main-button.component.ts',
    '**/nav-dropdown/nav-dropdown.component.ts',
    '**/new-header/logo-area/logo-area.component.ts',
    '**/html-input/editor-config.ts',
    '**/html-input/html-input.component.ts',
    '**/info-block/info-block.component.ts',
    '**/layout-right/layout.component.ts',
    '**/logger/logger.component.ts',
    '**/numeric-input/numeric.component.ts',
    '**/open-client-button/client-button.component.ts',
    '**/password-input-tag-validation/password-tag-validation.component.ts',
    '**/password-input/password.component.ts',
    '**/process-button/process-button.component.ts',
    '**/radio/radio.component.ts',
    '**/summary/summary.component.ts',
    '**/systems-list/list.component.ts',
    '**/update-webadmin-session/update-webadmin-session.component.ts',
    '**/bookmarks/bookmarks-widget.component.ts',
    '**/event-generator/event-generator.component.ts',
    '**/health-monitor/health-monitor-widget.component.ts',
    '**/helper-classes.ts',
    '**/live-view/live-view-widget.component.ts',
    '**/server-logger/server-logger-widget.component.ts',
    '**/server-monitor/server-monitor-widget.component.ts',
    '**/systems-list/systems-list-widget.component.ts',
    '**/third-party/third-party-widget.component.ts',
    /* Dialogs */
    '**/add-storage/add-storage.component.ts',
    '**/add-widget/add-widget.component.ts',
    '**/change-password/change-password.component.ts',
    '**/change-storage/change-storage.component.ts',
    '**/cloud-storage/action-common/BaseCloudStorageActionModalContent.ts',
    '**/detach-server/detach-server.component.ts',
    '**/dialog-config.ts',
    '**/dialog-ref.ts',
    '**/dialogs.service.ts',
    '**/download-async/download-async.component.ts',
    '**/download-async/package-handler.ts',
    '**/edit/edit.component.ts',
    '**/embed/embed.component.ts',
    '**/merge/merge.component.ts',
    '**/merge/stateForMergeDialog.ts',
    '**/merge/stateMachine.ts',
    '**/reset-backup/reset-backup.component.ts',
    '**/reset-server/reset-server.component.ts',
    '**/select-time-range-native-fallback/select-time-range.component.ts',
    '**/two-fa/two-fa.component.ts',
    '**/update-camera-credentials/update-camera-credentials.component.ts',
    /* Directives */
    '**/nx-editable.directive.ts',
    '**/nx-intersection.directive.ts',
    '**/nx-projected-link-handler.directive.ts',
    /* Features */
    '**/api-tool/api-file-utils.ts',
    '**/api-tool/api-tool-types.ts',
    '**/api-tool/dropdowns/api-tool-dropdown-utils.ts',
    '**/api-tool/services/api-tool-system.service.ts',
    '**/api-tool/services/openapi-json.service.ts',
    '**/api-tool/services/readonly-api.service.ts',
    '**/api-tool/swagger/swagger-textarea/swagger-textarea.component.ts',
    '**/api-tool/swagger/swagger-utils.ts',
    '**/api-tool/swagger/swagger.component.ts',
    '**/content/content.component.ts',
    '**/dashboard/dashboard.component.ts',
    '**/debug/debug.component.ts',
    '**/console/console.component.spec.ts',
    '**/console/console.component.ts',
    '**/console/console.service.ts',
    '**/console/edit/console-edit.component.spec.ts',
    '**/console/edit/console-edit.component.ts',
    '**/console/edit/console-edit.component.types.ts',
    '**/about/about.component.spec.ts',
    '**/about/about.component.ts',
    '**/about/about.component.types.ts',
    '**/about/error-state/error-state-manager.ts',
    '**/about/error-state/error-state.component.ts',
    '**/about/integrations/integrations.component.spec.ts',
    '**/about/integrations/integrations.component.ts',
    '**/dev-tools/dev-tools.component.ts',
    '**/knowledge-base/knowledge-base.component.ts',
    '**/knowledge-base/knowledge-base.service.ts',
    '**/email-notifications/email-notifications.component.ts',
    '**/alerts/alerts.component.ts',
    '**/card/card.component.ts',
    '**/health/health-layout.service.ts',
    '**/health/health.service.ts',
    '**/health/health.component.ts',
    '**/metrics/metrics.component.ts',
    '**/table-components/dynamic-table-panel/dynamic-table-panel.component.ts',
    '**/table-components/dynamic-table/dynamic-table.component.ts',
    '**/table-components/image-section/image-section.component.ts',
    '**/table-components/single-entity/single-entity.component.ts',
    '**/viewer/viewer.component.ts',
    '**/details/details.component.ts',
    '**/integration/integration.service.ts',
    '**/integration/integrations.component.ts',
    '**/integration/list/list.component.ts',
    '**/landing/landing.component.ts',
    '**/push-notifications/push-notifications.component.ts',
    '**/push-notifications/push-notifications.module.ts',
    '**/admin/admin.component.ts',
    '**/advanced/advanced.component.ts',
    '**/standard/standard.component.ts',
    '**/cameras/motion-detection-overlay/MotionMaskRenderer.ts',
    '**/cameras/motion-detection-overlay/MotionMaskState.ts',
    '**/cloud-storage/cloud-storage.component.ts',
    '**/license-details/license.component.spec.ts',
    '**/license-details/license.component.ts',
    '**/licenses/licenses.component.ts',
    '**/new/new.component.spec.ts',
    '**/new/new.component.ts',
    '**/trial/trial.component.ts',
    '**/systems/settings/settings.component.ts',
    '**/system-view-camera/fullscreen.ts',
    '**/system-view-camera/system-view-camera.page.component.ts',
    '**/system-view-index/system-view-index.page.component.ts',
    '**/playback-controls/playback-controls.component.ts',
    '**/playback-state-indicator/playback-state-indicator.component.ts',
    '**/player-js/player-js.component.ts',
    '**/player/player.component.ts',
    '**/playback.service.ts',
    '**/timeline-scrollbar/timeline-scrollbar.component.ts',
    '**/timeline-selection/timeline-selection.component.ts',
    '**/timeline/onPinch.ts',
    '**/timeline/timeline.component.ts',
    '**/services/TimeRange.ts',
    '**/animationPrimitives/AnimatedFloat.ts',
    '**/utils/estimateIrregularLengthIntervalPessimistically.ts',
    '**/utils/isIntervalOdd.ts',
    '**/ruler/timeline.primary-ruler-canvas-renderer.service.ts',
    '**/ruler/timeline.top-ruler-canvas-renderer.service.ts',
    '**/utils/getIntervalDiffDict.ts',
    '**/stripy-bar/stripy-bar.ts',
    '**/services/canvas-renderer/timeline.records-canvas-renderer.service.ts',
    '**/services/timeline.scrollbarAbsolute.service.ts',
    '**/services/timeline.scrollbarRelative.service.ts',
    '**/services/timeline.selection.service.ts',
    '**/services/timeline.service.ts',
    '**/services/timeline.time-under-mouse.service.ts',
    '**/highlighted-string/highlighted-string.component.ts',
    '**/media-server-list/media-server-list.component.ts',
    '**/datatypes/BirdViewTree.ts',
    '**/datatypes/Camera.ts',
    '**/datatypes/TestCamera.ts',
    '**/services/vms.service.ts',
    '**/vms/testMediaServers.ts',
    '**/utils/generateClickDubleClickPair.ts',
    /* Services */
    '**/account.service/base.ts',
    '**/account.service/cloud.ts',
    '**/account.service/local.ts',
    '**/apply.service/apply.service.ts',
    '**/apply.service/apply.service.type.ts',
    '**/apply.service/watcher.ts',
    '**/fps-meter.service.ts',
    '**/login.service.ts',
    '**/menus.service.ts',
    '**/menus.service.types.ts',
    '**/nx-app-state.service.ts',
    '**/nx-bootstrap-provider.ts',
    '**/nx-cloud-api/custom-client-api.ts',
    '**/nx-cloud-api/nx-cloud-api.ts',
    '**/nx-config/base-config.ts',
    '**/nx-config/nx-config.service.ts',
    '**/nx-header.service.ts',
    '**/nx-language-provider.ts',
    '**/nx-static-cache.ts',
    '**/oauth.service.ts',
    '**/page.service.ts',
    '**/process.service/process.service.ts',
    '**/process.service/process.ts',
    '**/storage.service.ts',
    '**/sw-cache.service.ts',
    '**/system-api.service.ts',
    '**/system-api.types.ts',
    '**/system-groups-data.service.ts',
    '**/system-legacy-api.service.ts',
    '**/system-rest-api-v2.service.ts',
    '**/system-rest-api.service.ts',
    '**/system.service/server-manager/server-manager.ts',
    '**/system.service/storage-manager/current-storage-state.ts',
    '**/system.service/storage-manager/storage-manager.ts',
    '**/system.service/storage-manager/storage-state.ts',
    '**/system.service/storage-manager/storage.ts',
    '**/system.service/system-types.ts',
    '**/system.service/system.ts',
    '**/uri.service.ts',
    '**/url-protocol.service.ts',
    '**/url-protocol.service.types.ts',
    /* Utils */
    '**/logger.ts',
    /* Packages */
    '**/dashboard-widget-state/types.ts',
];

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
                'brace-style': ['error', '1tbs', {
                    allowSingleLine: false,
                }],
                camelcase: ['error', {
                    properties: 'never',
                    ignoreDestructuring: true,
                }],
                'comma-dangle': ['error', 'only-multiline'],
                // 'comma-dangle': ['error', 'always-multiline'],
                curly: ['error', 'all'],
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
                    asyncArrow: 'always',
                }],

                'import/no-default-export': 'error',
                'import/order': ['error', {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                    ],
                    pathGroups: Object.keys(
                        require('./tsconfig.base.json').compilerOptions.paths,
                    ).map(path => ({
                        pattern: `${path}*`,
                        /* Assuming that tsconfig paths end with single asterisk so
                that the pattern here will end with double asterisk */
                        group: 'internal',
                    })),
                    pathGroupsExcludedImportTypes: ['internal'],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc' },
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

                'nx/ban-global-variables': ['error', [
                    'window',
                    'document',
                ]],
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
                            ].join('\n'),
                        },
                    },
                }],
                ...tsExtension('brace-style', [
                    'error',
                    '1tbs',
                    { allowSingleLine: false },
                ]),
                ...tsExtension('comma-dangle', ['error', 'only-multiline']),
                ...tsExtension('comma-spacing'),
                ...tsExtension('dot-notation', [
                    'error',
                    { allowKeywords: true },
                ]),
                ...tsExtension('func-call-spacing'),
                ...tsExtension('keyword-spacing'),
                ...tsExtension('lines-between-class-members', ['error', {
                    exceptAfterSingleLine: true,
                }]),
                '@typescript-eslint/member-delimiter-style': 'error',
                ...tsExtension('no-array-constructor'),
                ...tsExtension('no-dupe-class-members'),
                ...tsExtension('no-extra-parens', ['error', 'functions']),
                ...tsExtension('no-extra-semi'),
                ...tsExtension('no-implied-eval'),
                ...tsExtension('no-redeclare', ['error', {
                    builtinGlobals: false,
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
                    allowTaggedTemplates: true,
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
                    asyncArrow: 'always',
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
            excludedFiles: typeLintBlacklist,
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
                            ].join('\n'),
                        },
                    },
                }],
                '@typescript-eslint/explicit-function-return-type': [
                    'error',
                    { allowExpressions: true },
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
            extends: ['plugin:@angular-eslint/recommended'],
            plugins: ['@angular-eslint'],
            rules: {
                // TODO: Evaluate whether we want these or not
                '@angular-eslint/component-class-suffix': 'off',
                '@angular-eslint/contextual-lifecycle': 'off',
                '@angular-eslint/directive-class-suffix': 'off',
                '@angular-eslint/no-empty-lifecycle-method': 'off',
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
            excludedFiles: [
            ],
            rules: {
                '@angular-eslint/component-selector': ['error', {
                    type: 'element',
                    prefix: 'nx',
                    style: 'kebab-case',
                }],
            },
        },
        {
            // Don't need to enforce naming on sandbox components
            files: ['**/sandbox/**/*.ts'],
            rules: {
                '@angular-eslint/component-class-suffix': 'off',
                '@angular-eslint/component-selector': 'off',
                '@angular-eslint/directive-class-suffix': 'off',
            },
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
            },
        },
        {
            /* Allow top-down organization in types files */
            files: ['*types.ts', '*.d.ts', '**/nx-config/base-config.ts'],
            rules: {
                '@typescript-eslint/no-use-before-define': ['error', {
                    enums: true,
                    typedefs: true,
                    ignoreTypeReferences: true,
                }],
            },
        },
        {
            files: [
                // '*.js', '*.ts'
                'libs/components/**/*.ts',
                'libs/db/**/*.ts',
                'libs/decorators/**/*.ts',
                'libs/directives/**/*.ts',
                'libs/features/[0-c]*/**/*.ts',
                'libs/features/[d][a]*/**/*.ts',
                'libs/features/developer-console/**/*.ts',
                'libs/interceptors/**/*.ts',
                'libs/menu/**/*.ts',
                'libs/pipes/**/*.ts',
                'libs/resolvers/**/*.ts',
                'libs/routeGuards/**/*.ts',
                'libs/utils/**/*.ts',
            ],
            excludedFiles: ['*.module.ts', '*.spec.ts'], // Lower priority
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
                'nx/template/translate-contents': ['error', [
                    'svg-icon',
                ]],
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
                'prettier/prettier': ['error', {
                    parser: 'angular',
                }],
            },
        },
    ],
};
