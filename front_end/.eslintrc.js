/** Files that need to be typed */
const typeLintBlacklist = [
    'packages/dashboard-widget-state/types.ts',
    'src/app/_mocks/getSettings.mock.ts',
    'src/app/_mocks/helpers.test.ts',
    'src/app/components/advanced-filter/advanced-filter.component.ts',
    'src/app/components/apply/apply.component.ts',
    'src/app/components/carousel/carousel.component.ts',
    'src/app/components/console-table/console-table.component.spec.ts',
    'src/app/components/console-table/console-table.component.ts',
    'src/app/components/console-table/console-table.component.types.ts',
    'src/app/components/console-table/table-data-source.ts',
    'src/app/components/content-block/alert/block-default.component.spec.ts',
    'src/app/components/developers-menu/developers-menu.component.ts',
    'src/app/components/dropdowns/active-system/active-system.component.ts',
    'src/app/components/dropdowns/drop-menu/drop-menu.component.ts',
    'src/app/components/dropdowns/drop-menu/navigation-tile/navigation-tile.component.ts',
    'src/app/components/dropdowns/injDropdown.ts',
    'src/app/components/dropdowns/language/language.component.ts',
    'src/app/components/dropdowns/nav-location/nav.component.ts',
    'src/app/components/dropdowns/permissions/permissions.component.ts',
    'src/app/components/dynamic-widget/dynamic-widget.component.ts',
    'src/app/components/dynamic-widget/register-widget.ts',
    'src/app/components/editable/editable.component.ts',
    'src/app/components/editable/heading/editable-heading.component.ts',
    'src/app/components/email-input/email.component.ts',
    'src/app/components/external-video/external-video.component.ts',
    'src/app/components/footer/footer.component.ts',
    'src/app/components/header/header.component.ts',
    'src/app/components/header/main-button/main-button.component.ts',
    'src/app/components/header/nav-dropdown/nav-dropdown.component.ts',
    'src/app/components/header/new-header/logo-area/logo-area.component.ts',
    'src/app/components/html-input/editor-config.ts',
    'src/app/components/html-input/html-input.component.ts',
    'src/app/components/info-block/info-block.component.ts',
    'src/app/components/layout-right/layout.component.ts',
    'src/app/components/logger/logger.component.ts',
    'src/app/components/numeric-input/numeric.component.ts',
    'src/app/components/open-client-button/client-button.component.ts',
    'src/app/components/password-input-tag-validation/password-tag-validation.component.ts',
    'src/app/components/password-input/password.component.ts',
    'src/app/components/process-button/process-button.component.ts',
    'src/app/components/radio/radio.component.ts',
    'src/app/components/summary/summary.component.ts',
    'src/app/components/switch/switch.component.ts',
    'src/app/components/systems-list/list.component.ts',
    'src/app/components/update-webadmin-session/update-webadmin-session.component.ts',
    'src/app/components/widgets/bookmarks/bookmarks-widget.component.ts',
    'src/app/components/widgets/event-generator/event-generator.component.ts',
    'src/app/components/widgets/health-monitor/health-monitor-widget.component.ts',
    'src/app/components/widgets/helper-classes.ts',
    'src/app/components/widgets/live-view/live-view-widget.component.ts',
    'src/app/components/widgets/server-logger/server-logger-widget.component.ts',
    'src/app/components/widgets/server-monitor/server-monitor-widget.component.ts',
    'src/app/components/widgets/systems-list/systems-list-widget.component.ts',
    'src/app/components/widgets/third-party/third-party-widget.component.ts',
    'libs/dialogs/add-storage/add-storage.component.ts',
    'libs/dialogs/add-user/add-user.component.ts',
    'libs/dialogs/add-widget/add-widget.component.ts',
    'libs/dialogs/apply/apply.component.ts',
    'libs/dialogs/change-password/change-password.component.ts',
    'libs/dialogs/change-storage/change-storage.component.ts',
    'libs/dialogs/cloud-storage/action-common/BaseCloudStorageActionModalContent.ts',
    'libs/dialogs/connect-cloud/connect-cloud.component.ts',
    'libs/dialogs/delete-cloud-user/delete-cloud-user.component.ts',
    'libs/dialogs/detach-server/detach-server.component.ts',
    'libs/dialogs/dialog-config.ts',
    'libs/dialogs/dialog-ref.ts',
    'libs/dialogs/dialogs.service.ts',
    'libs/dialogs/download-async/download-async.component.ts',
    'libs/dialogs/download-async/package-handler.ts',
    'libs/dialogs/edit/edit.component.ts',
    'libs/dialogs/embed/embed.component.ts',
    'libs/dialogs/generic/generic.component.ts',
    'libs/dialogs/mandatory-2fa/mandatory-2fa.component.ts',
    'libs/dialogs/merge/merge.component.ts',
    'libs/dialogs/merge/stateForMergeDialog.ts',
    'libs/dialogs/merge/stateMachine.ts',
    'libs/dialogs/message/message.component.ts',
    'libs/dialogs/remove-system/remove-system.component.ts',
    'libs/dialogs/remove-user/remove-user.component.ts',
    'libs/dialogs/reset-backup/reset-backup.component.ts',
    'libs/dialogs/reset-server/reset-server.component.ts',
    'libs/dialogs/select-time-range-native-fallback/select-time-range.component.ts',
    'libs/dialogs/simple-dialogs.service.ts',
    'libs/dialogs/two-fa/two-fa.component.ts',
    'libs/dialogs/update-camera-credentials/update-camera-credentials.component.ts',
    'libs/directives/nx-editable.directive.ts',
    'libs/directives/nx-intersection.directive.ts',
    'libs/directives/nx-projected-link-handler.directive.ts',
    'src/app/pages/account/password/password.component.ts',
    'src/app/pages/account/security/security.component.ts',
    'src/app/pages/account/settings/settings.component.ts',
    'src/app/pages/api-tool/api-file-utils.ts',
    'src/app/pages/api-tool/api-tool-types.ts',
    'src/app/pages/api-tool/dropdowns/api-tool-dropdown-utils.ts',
    'src/app/pages/api-tool/services/api-tool-system.service.ts',
    'src/app/pages/api-tool/services/openapi-json.service.ts',
    'src/app/pages/api-tool/services/readonly-api.service.ts',
    'src/app/pages/api-tool/swagger/swagger-textarea/swagger-textarea.component.ts',
    'src/app/pages/api-tool/swagger/swagger-utils.ts',
    'src/app/pages/api-tool/swagger/swagger.component.ts',
    'src/app/pages/content/content.component.ts',
    'src/app/pages/dashboard/dashboard.component.ts',
    'src/app/pages/debug/debug.component.ts',
    'src/app/pages/developer-console/console/console.component.spec.ts',
    'src/app/pages/developer-console/console/console.component.ts',
    'src/app/pages/developer-console/console/console.service.ts',
    'src/app/pages/developer-console/console/edit/console-edit.component.spec.ts',
    'src/app/pages/developer-console/console/edit/console-edit.component.ts',
    'src/app/pages/developer-console/console/edit/console-edit.component.types.ts',
    'src/app/pages/developers/about/about.component.spec.ts',
    'src/app/pages/developers/about/about.component.ts',
    'src/app/pages/developers/about/about.component.types.ts',
    'src/app/pages/developers/about/error-state/error-state-manager.ts',
    'src/app/pages/developers/about/error-state/error-state.component.ts',
    'src/app/pages/developers/about/integrations/integrations.component.spec.ts',
    'src/app/pages/developers/about/integrations/integrations.component.ts',
    'src/app/pages/developers/dev-tools/dev-tools.component.ts',
    'src/app/pages/developers/knowledge-base/knowledge-base.component.ts',
    'src/app/pages/developers/knowledge-base/knowledge-base.service.ts',
    'src/app/pages/download-history/download-history.component.ts',
    'src/app/pages/download-history/release/release.component.ts',
    'src/app/pages/download/download.component.ts',
    'src/app/pages/email-notifications/email-notifications.component.ts',
    'src/app/pages/health/alerts/alerts.component.ts',
    'src/app/pages/health/card/card.component.ts',
    'src/app/pages/health/health-layout.service.ts',
    'src/app/pages/health/health.service.ts',
    'src/app/pages/health/health/health.component.ts',
    'src/app/pages/health/metrics/metrics.component.ts',
    'src/app/pages/health/table-components/dynamic-table-panel/dynamic-table-panel.component.ts',
    'src/app/pages/health/table-components/dynamic-table/dynamic-table.component.ts',
    'src/app/pages/health/table-components/image-section/image-section.component.ts',
    'src/app/pages/health/table-components/single-entity/single-entity.component.ts',
    'src/app/pages/health/viewer/viewer.component.ts',
    'src/app/pages/integration/details/details.component.ts',
    'src/app/pages/integration/details/overview/overview.component.ts',
    'src/app/pages/integration/details/setup/setup.component.ts',
    'src/app/pages/integration/integration.service.ts',
    'src/app/pages/integration/integrations.component.ts',
    'src/app/pages/integration/list/list.component.ts',
    'src/app/pages/landing/landing.component.ts',
    'src/app/pages/push-notifications/push-notifications.component.ts',
    'src/app/pages/push-notifications/push-notifications.module.ts',
    'src/app/pages/sandbox/dynamic-form-apply-example/dynamic-form-apply-example.component.ts',
    'src/app/pages/sandbox/form-apply-example/form-apply-example.component.ts',
    'src/app/pages/sandbox/form-elements/form-elements.component.ts',
    'src/app/pages/sandbox/ngrx-demo/store/groups/groups.selectors.ts',
    'src/app/pages/sandbox/section-apply-example/section-apply-example.component.ts',
    'src/app/pages/sandbox/websocket/websocket.component.ts',
    'src/app/pages/systems/bookmarks/bookmark.service.ts',
    'src/app/pages/systems/bookmarks/bookmarks.component.ts',
    'src/app/pages/systems/settings/admin/admin.component.ts',
    'src/app/pages/systems/settings/admin/advanced/advanced.component.ts',
    'src/app/pages/systems/settings/admin/standard/standard.component.ts',
    'src/app/pages/systems/settings/cameras/cameras.component.ts',
    'src/app/pages/systems/settings/cameras/motion-detection-overlay/MotionMaskRenderer.ts',
    'src/app/pages/systems/settings/cameras/motion-detection-overlay/MotionMaskState.ts',
    'src/app/pages/systems/settings/cloud-storage/cloud-storage.component.ts',
    'src/app/pages/systems/settings/licenses/license-details/license.component.spec.ts',
    'src/app/pages/systems/settings/licenses/license-details/license.component.ts',
    'src/app/pages/systems/settings/licenses/licenses.component.ts',
    'src/app/pages/systems/settings/licenses/new/new.component.spec.ts',
    'src/app/pages/systems/settings/licenses/new/new.component.ts',
    'src/app/pages/systems/settings/licenses/trial/trial.component.ts',
    'src/app/pages/systems/settings/settings.component.ts',
    'src/app/pages/systems/settings/users/users.component.ts',
    'src/app/pages/systems/view/pages/system-view-camera/fullscreen.ts',
    'src/app/pages/systems/view/pages/system-view-camera/system-view-camera.page.component.ts',
    'src/app/pages/systems/view/pages/system-view-index/system-view-index.page.component.ts',
    'src/app/pages/systems/view/vms-client/submodules/playback/components/playback-controls/playback-controls.component.ts',
    'src/app/pages/systems/view/vms-client/submodules/playback/components/playback-state-indicator/playback-state-indicator.component.ts',
    'src/app/pages/systems/view/vms-client/submodules/playback/components/player/player-js/player-js.component.ts',
    'src/app/pages/systems/view/vms-client/submodules/playback/components/player/player.component.ts',
    'src/app/pages/systems/view/vms-client/submodules/playback/services/playback.service.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/components/timeline-scrollbar/timeline-scrollbar.component.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/components/timeline-selection/timeline-selection.component.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/components/timeline/onPinch.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/components/timeline/timeline.component.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/TimeRange.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/animationPrimitives/AnimatedFloat.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/intervals/utils/estimateIrregularLengthIntervalPessimistically.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/intervals/utils/isIntervalOdd.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/timeline.primary-ruler-canvas-renderer.service.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/timeline.top-ruler-canvas-renderer.service.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/utils/getIntervalDiffDict.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/stripy-bar/stripy-bar.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/timeline.records-canvas-renderer.service.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/timeline.scrollbarAbsolute.service.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/timeline.scrollbarRelative.service.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/timeline.selection.service.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/timeline.service.ts',
    'src/app/pages/systems/view/vms-client/submodules/timeline/services/timeline.time-under-mouse.service.ts',
    'src/app/pages/systems/view/vms-client/submodules/vms/components/highlighted-string/highlighted-string.component.ts',
    'src/app/pages/systems/view/vms-client/submodules/vms/components/media-server-list/media-server-list.component.ts',
    'src/app/pages/systems/view/vms-client/submodules/vms/datatypes/BirdViewTree.ts',
    'src/app/pages/systems/view/vms-client/submodules/vms/datatypes/Camera.ts',
    'src/app/pages/systems/view/vms-client/submodules/vms/datatypes/TestCamera.ts',
    'src/app/pages/systems/view/vms-client/submodules/vms/services/vms.service.ts',
    'src/app/pages/systems/view/vms-client/submodules/vms/testMediaServers.ts',
    'src/app/pages/systems/view/vms-client/utils/generateClickDubleClickPair.ts',
    'src/app/pages/systems/view/vms-client/utils/index.ts',
    'src/app/services/account.service/base.ts',
    'src/app/services/account.service/cloud.ts',
    'src/app/services/account.service/local.ts',
    'src/app/services/apply.service/apply.service.ts',
    'src/app/services/apply.service/apply.service.type.ts',
    'src/app/services/apply.service/watcher.ts',
    'src/app/services/fps-meter.service.ts',
    'src/app/services/login.service.ts',
    'src/app/services/menus.service.ts',
    'src/app/services/menus.service.types.ts',
    'src/app/services/nx-app-state.service.ts',
    'src/app/services/nx-bootstrap-provider.ts',
    'src/app/services/nx-cloud-api/custom-client-api.ts',
    'src/app/services/nx-cloud-api/nx-cloud-api.ts',
    'src/app/services/nx-config/base-config.ts',
    'src/app/services/nx-config/nx-config.service.ts',
    'src/app/services/nx-header.service.ts',
    'src/app/services/nx-language-provider.ts',
    'src/app/services/nx-static-cache.ts',
    'src/app/services/oauth.service.ts',
    'src/app/services/page.service.ts',
    'src/app/services/process.service/process.service.ts',
    'src/app/services/process.service/process.ts',
    'src/app/services/storage.service.ts',
    'src/app/services/sw-cache.service.ts',
    'src/app/services/system-api.service.ts',
    'src/app/services/system-api.types.ts',
    'src/app/services/system-groups-data.service.ts',
    'src/app/services/system-legacy-api.service.ts',
    'src/app/services/system-rest-api.service.ts',
    'src/app/services/system-rest-api-v2.service.ts',
    'src/app/services/system.service/camera-manager/camera-manager-types.ts',
    'src/app/services/system.service/camera-manager/camera-manager.ts',
    'src/app/services/system.service/server-manager/server-manager.ts',
    'src/app/services/system.service/storage-manager/current-storage-state.ts',
    'src/app/services/system.service/storage-manager/storage-manager.ts',
    'src/app/services/system.service/storage-manager/storage-state.ts',
    'src/app/services/system.service/storage-manager/storage.ts',
    'src/app/services/system.service/system-types.ts',
    'src/app/services/system.service/system.ts',
    'src/app/services/system.service/user-manager/user-manager.ts',
    'src/app/services/uri.service.ts',
    'src/app/services/url-protocol.service.ts',
    'src/app/services/url-protocol.service.types.ts',
    'src/app/utils/logger.ts',
    'src/test.ts'
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

                'nx/no-global-window': 'error',
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
                'plugin:@angular-eslint/recommended',
                // 'plugin:@angular-eslint/template/process-inline-templates',
            ],
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
            // Temporary override for applying @angular-eslint rules
            files: ['*.ts'],
            excludedFiles: [
            ],
            rules: {
                '@angular-eslint/component-selector': ['error', {
                    type: 'element',
                    prefix: 'nx',
                    style: 'kebab-case'
                }]
            }
        },
        {
            // Don't need to enforce naming on sandbox components
            files: ['src/app/pages/sandbox/**/*.ts'],
            rules: {
                '@angular-eslint/component-class-suffix': 'off',
                '@angular-eslint/component-selector': 'off',
                '@angular-eslint/directive-class-suffix': 'off',
            }
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
            files: ['*types.ts', 'src/app/services/nx-config/base-config.ts'],
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
            parser: '@angular-eslint/template-parser',
            plugins: ['@angular-eslint/template'],
            rules: {}
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
            }
        },
        {
            files: ['*.component.html'],
            excludedFiles: [
                'src/app/pages/debug/debug.component.html',
                'src/app/pages/email-notifications/email-notifications.component.html',
                'src/app/pages/layout/layout.component.html',
                'src/app/pages/push-notifications/push-notifications.component.html',
                'src/app/pages/sandbox/**/*',
                // Not required for internal/testing components
            ],
            rules: {
                'nx/template/no-untranslated': 'error',
            }
        },
        {
            files: ['*.component.html'],
            excludedFiles: ['*inline-template-*.component.html'],
            extends: ['plugin:prettier/recommended'],
            plugins: ['prettier'],
            rules: {
                'prettier/prettier': ['error', {
                    parser: 'angular',
                    printWidth: 100,
                    singleAttributePerLine: true,
                }]
            }
        },
    ]
};
