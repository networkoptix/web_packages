/** Files that need to be typed */
const typeLintBlacklist = [
    'app/lib/dashboard-widget-state/types.ts',
    'app/src/_mocks/getSettings.mock.ts',
    'app/src/_mocks/helpers.test.ts',
    'app/src/components/advanced-filter/advanced-filter.component.ts',
    'app/src/components/apply/apply.component.ts',
    'app/src/components/carousel/carousel.component.ts',
    'app/src/components/console-table/console-table.component.spec.ts',
    'app/src/components/console-table/console-table.component.ts',
    'app/src/components/console-table/console-table.component.types.ts',
    'app/src/components/console-table/table-data-source.ts',
    'app/src/components/content-block/alert/block-default.component.spec.ts',
    'app/src/components/content-block/content-block.component.ts',
    'app/src/components/developers-menu/developers-menu.component.ts',
    'app/src/components/dropdowns/account-settings/account-settings.component.ts',
    'app/src/components/dropdowns/active-system/active-system.component.ts',
    'app/src/components/dropdowns/drop-menu/drop-menu.component.ts',
    'app/src/components/dropdowns/drop-menu/navigation-tile/navigation-tile.component.ts',
    'app/src/components/dropdowns/injDropdown.ts',
    'app/src/components/dropdowns/language/language.component.ts',
    'app/src/components/dropdowns/nav-location/nav.component.ts',
    'app/src/components/dropdowns/permissions/permissions.component.ts',
    'app/src/components/dynamic-widget/dynamic-widget.component.ts',
    'app/src/components/dynamic-widget/register-widget.ts',
    'app/src/components/editable/editable.component.ts',
    'app/src/components/editable/heading/editable-heading.component.ts',
    'app/src/components/email-input/email.component.ts',
    'app/src/components/external-video/external-video.component.ts',
    'app/src/components/footer/footer.component.ts',
    'app/src/components/graph/graph.component.ts',
    'app/src/components/header/header.component.ts',
    'app/src/components/header/main-button/main-button.component.ts',
    'app/src/components/header/nav-dropdown/nav-dropdown.component.ts',
    'app/src/components/header/new-header/logo-area/logo-area.component.ts',
    'app/src/components/header/new-header/mobile/mobile-menu/mobile-menu.component.ts',
    'app/src/components/html-input/editor-config.ts',
    'app/src/components/html-input/html-input.component.ts',
    'app/src/components/info-block/info-block.component.ts',
    'app/src/components/layout-right/layout.component.ts',
    'app/src/components/logger/logger.component.ts',
    'app/src/components/numeric-input/numeric.component.ts',
    'app/src/components/open-client-button/client-button.component.ts',
    'app/src/components/password-input-tag-validation/password-tag-validation.component.ts',
    'app/src/components/password-input-validation/password-validation.component.ts',
    'app/src/components/password-input/password.component.ts',
    'app/src/components/process-button/process-button.component.ts',
    'app/src/components/radio/radio.component.ts',
    'app/src/components/ribbon/ribbon.component.ts',
    'app/src/components/ribbon/ribbon.service.ts',
    'app/src/components/switch/switch.component.ts',
    'app/src/components/systems-list/list.component.ts',
    'app/src/components/update-webadmin-session/update-webadmin-session.component.ts',
    'app/src/components/widgets/bookmarks/bookmarks-widget.component.ts',
    'app/src/components/widgets/event-generator/event-generator.component.ts',
    'app/src/components/widgets/health-monitor/health-monitor-widget.component.ts',
    'app/src/components/widgets/helper-classes.ts',
    'app/src/components/widgets/live-view/live-view-widget.component.ts',
    'app/src/components/widgets/server-logger/server-logger-widget.component.ts',
    'app/src/components/widgets/server-monitor/server-monitor-widget.component.ts',
    'app/src/components/widgets/systems-list/systems-list-widget.component.ts',
    'app/src/components/widgets/third-party/third-party-widget.component.ts',
    'app/src/dialogs/add-storage/add-storage.component.ts',
    'app/src/dialogs/add-user/add-user.component.ts',
    'app/src/dialogs/add-widget/add-widget.component.ts',
    'app/src/dialogs/apply/apply.component.ts',
    'app/src/dialogs/change-password/change-password.component.ts',
    'app/src/dialogs/change-storage/change-storage.component.ts',
    'app/src/dialogs/cloud-storage/action-common/BaseCloudStorageActionModalContent.ts',
    'app/src/dialogs/connect-cloud/connect-cloud.component.ts',
    'app/src/dialogs/delete-cloud-user/delete-cloud-user.component.ts',
    'app/src/dialogs/detach-server/detach-server.component.ts',
    'app/src/dialogs/dialog-config.ts',
    'app/src/dialogs/dialog-ref.ts',
    'app/src/dialogs/dialogs.service.ts',
    'app/src/dialogs/download-async/download-async.component.ts',
    'app/src/dialogs/download-async/package-handler.ts',
    'app/src/dialogs/edit/edit.component.ts',
    'app/src/dialogs/embed/embed.component.ts',
    'app/src/dialogs/generic/generic.component.ts',
    'app/src/dialogs/mandatory-2fa/mandatory-2fa.component.ts',
    'app/src/dialogs/merge/merge.component.ts',
    'app/src/dialogs/merge/stateForMergeDialog.ts',
    'app/src/dialogs/merge/stateMachine.ts',
    'app/src/dialogs/message/message.component.ts',
    'app/src/dialogs/remove-system/remove-system.component.ts',
    'app/src/dialogs/remove-user/remove-user.component.ts',
    'app/src/dialogs/reset-backup/reset-backup.component.ts',
    'app/src/dialogs/reset-server/reset-server.component.ts',
    'app/src/dialogs/select-time-range-native-fallback/select-time-range.component.ts',
    'app/src/dialogs/simple-dialogs.service.ts',
    'app/src/dialogs/two-fa/two-fa.component.ts',
    'app/src/dialogs/update-camera-credentials/update-camera-credentials.component.ts',
    'app/src/directives/nx-editable.directive.ts',
    'app/src/directives/nx-intersection.directive.ts',
    'app/src/directives/nx-projected-link-handler.directive.ts',
    'app/src/pages/account/password/password.component.ts',
    'app/src/pages/account/security/security.component.ts',
    'app/src/pages/account/settings/settings.component.ts',
    'app/src/pages/api-tool/api-file-utils.ts',
    'app/src/pages/api-tool/api-tool-types.ts',
    'app/src/pages/api-tool/dropdowns/api-tool-dropdown-utils.ts',
    'app/src/pages/api-tool/services/api-tool-system.service.ts',
    'app/src/pages/api-tool/services/openapi-json.service.ts',
    'app/src/pages/api-tool/services/readonly-api.service.ts',
    'app/src/pages/api-tool/swagger/swagger-textarea/swagger-textarea.component.ts',
    'app/src/pages/api-tool/swagger/swagger-utils.ts',
    'app/src/pages/api-tool/swagger/swagger.component.ts',
    'app/src/pages/content/content.component.ts',
    'app/src/pages/dashboard/dashboard.component.ts',
    'app/src/pages/debug/debug.component.ts',
    'app/src/pages/developer-console/console/console.component.spec.ts',
    'app/src/pages/developer-console/console/console.component.ts',
    'app/src/pages/developer-console/console/console.service.ts',
    'app/src/pages/developer-console/console/edit/console-edit.component.spec.ts',
    'app/src/pages/developer-console/console/edit/console-edit.component.ts',
    'app/src/pages/developer-console/console/edit/console-edit.component.types.ts',
    'app/src/pages/developers/about/about.component.spec.ts',
    'app/src/pages/developers/about/about.component.ts',
    'app/src/pages/developers/about/about.component.types.ts',
    'app/src/pages/developers/about/error-state/error-state-manager.ts',
    'app/src/pages/developers/about/error-state/error-state.component.ts',
    'app/src/pages/developers/about/integrations/integrations.component.spec.ts',
    'app/src/pages/developers/about/integrations/integrations.component.ts',
    'app/src/pages/developers/dev-tools/dev-tools.component.ts',
    'app/src/pages/developers/knowledge-base/knowledge-base.component.ts',
    'app/src/pages/developers/knowledge-base/knowledge-base.service.ts',
    'app/src/pages/download-history/download-history.component.ts',
    'app/src/pages/download-history/release/release.component.ts',
    'app/src/pages/download/download.component.ts',
    'app/src/pages/download/os-resolver.ts',
    'app/src/pages/email-notifications/email-notifications.component.ts',
    'app/src/pages/health/alerts/alerts.component.ts',
    'app/src/pages/health/card/card.component.ts',
    'app/src/pages/health/health-layout.service.ts',
    'app/src/pages/health/health.service.ts',
    'app/src/pages/health/health/health.component.ts',
    'app/src/pages/health/metrics/metrics.component.ts',
    'app/src/pages/health/table-components/dynamic-table-panel/dynamic-table-panel.component.ts',
    'app/src/pages/health/table-components/dynamic-table/dynamic-table.component.ts',
    'app/src/pages/health/table-components/image-section/image-section.component.ts',
    'app/src/pages/health/table-components/image/image.component.ts',
    'app/src/pages/health/table-components/single-entity/single-entity.component.ts',
    'app/src/pages/health/viewer/viewer.component.ts',
    'app/src/pages/integration/details/details.component.ts',
    'app/src/pages/integration/details/overview/overview.component.ts',
    'app/src/pages/integration/details/setup/setup.component.ts',
    'app/src/pages/integration/integration.service.ts',
    'app/src/pages/integration/integrations.component.ts',
    'app/src/pages/integration/list/list.component.ts',
    'app/src/pages/landing/landing.component.ts',
    'app/src/pages/monitoring/monitoring.component.ts',
    'app/src/pages/push-notifications/push-notifications.component.ts',
    'app/src/pages/push-notifications/push-notifications.module.ts',
    'app/src/pages/sandbox/dynamic-form-apply-example/dynamic-form-apply-example.component.ts',
    'app/src/pages/sandbox/form-apply-example/form-apply-example.component.ts',
    'app/src/pages/sandbox/form-elements/form-elements.component.ts',
    'app/src/pages/sandbox/ngrx-demo/store/groups/groups.selectors.ts',
    'app/src/pages/sandbox/section-apply-example/section-apply-example.component.ts',
    'app/src/pages/sandbox/websocket/websocket.component.ts',
    'app/src/pages/systems/bookmarks/bookmark.service.ts',
    'app/src/pages/systems/bookmarks/bookmarks.component.ts',
    'app/src/pages/systems/settings/admin/admin.component.ts',
    'app/src/pages/systems/settings/admin/advanced/advanced.component.ts',
    'app/src/pages/systems/settings/admin/standard/standard.component.ts',
    'app/src/pages/systems/settings/cameras/cameras.component.ts',
    'app/src/pages/systems/settings/cameras/motion-detection-overlay/MotionMaskRenderer.ts',
    'app/src/pages/systems/settings/cameras/motion-detection-overlay/MotionMaskState.ts',
    'app/src/pages/systems/settings/cloud-storage/cloud-storage.component.ts',
    'app/src/pages/systems/settings/licenses/license-details/license.component.spec.ts',
    'app/src/pages/systems/settings/licenses/license-details/license.component.ts',
    'app/src/pages/systems/settings/licenses/licenses.component.ts',
    'app/src/pages/systems/settings/licenses/new/new.component.spec.ts',
    'app/src/pages/systems/settings/licenses/new/new.component.ts',
    'app/src/components/summary/summary.component.spec.ts',
    'app/src/components/summary/summary.component.ts',
    'app/src/pages/systems/settings/licenses/trial/trial.component.ts',
    'app/src/pages/systems/settings/settings.component.ts',
    'app/src/pages/systems/settings/users/users.component.ts',
    'app/src/pages/systems/view/pages/system-view-camera/fullscreen.ts',
    'app/src/pages/systems/view/pages/system-view-camera/system-view-camera.page.component.ts',
    'app/src/pages/systems/view/pages/system-view-index/system-view-index.page.component.ts',
    'app/src/pages/systems/view/vms-client/submodules/playback/components/playback-controls/playback-controls.component.ts',
    'app/src/pages/systems/view/vms-client/submodules/playback/components/playback-state-indicator/playback-state-indicator.component.ts',
    'app/src/pages/systems/view/vms-client/submodules/playback/components/player/player-js/player-js.component.ts',
    'app/src/pages/systems/view/vms-client/submodules/playback/components/player/player.component.ts',
    'app/src/pages/systems/view/vms-client/submodules/playback/services/playback.service.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/components/timeline-playback-indicator/timeline-playback-indicator.component.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/components/timeline-scrollbar/timeline-scrollbar.component.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/components/timeline-selection-action-panel/utils.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/components/timeline-selection/timeline-selection.component.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/components/timeline/onPinch.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/components/timeline/timeline.component.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/TimeRange.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/animationPrimitives/AnimatedFloat.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/intervals/utils/estimateIrregularLengthIntervalPessimistically.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/intervals/utils/isIntervalOdd.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/timeline.primary-ruler-canvas-renderer.service.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/timeline.top-ruler-canvas-renderer.service.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/ruler/utils/getIntervalDiffDict.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/stripy-bar/stripy-bar.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/canvas-renderer/timeline.records-canvas-renderer.service.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/timeline.scrollbarAbsolute.service.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/timeline.scrollbarRelative.service.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/timeline.selection.service.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/timeline.service.ts',
    'app/src/pages/systems/view/vms-client/submodules/timeline/services/timeline.time-under-mouse.service.ts',
    'app/src/pages/systems/view/vms-client/submodules/vms/components/highlighted-string/highlighted-string.component.ts',
    'app/src/pages/systems/view/vms-client/submodules/vms/components/media-server-list/media-server-list.component.ts',
    'app/src/pages/systems/view/vms-client/submodules/vms/datatypes/BirdViewTree.ts',
    'app/src/pages/systems/view/vms-client/submodules/vms/datatypes/Camera.ts',
    'app/src/pages/systems/view/vms-client/submodules/vms/datatypes/TestCamera.ts',
    'app/src/pages/systems/view/vms-client/submodules/vms/services/vms.service.ts',
    'app/src/pages/systems/view/vms-client/submodules/vms/testMediaServers.ts',
    'app/src/pages/systems/view/vms-client/utils/generateClickDubleClickPair.ts',
    'app/src/pages/systems/view/vms-client/utils/index.ts',
    'app/src/services/account.service/base.ts',
    'app/src/services/account.service/cloud.ts',
    'app/src/services/account.service/local.ts',
    'app/src/services/apply.service/apply.service.ts',
    'app/src/services/apply.service/apply.service.type.ts',
    'app/src/services/apply.service/watcher.ts',
    'app/src/services/fps-meter.service.ts',
    'app/src/services/login.service.ts',
    'app/src/services/menus.service.ts',
    'app/src/services/menus.service.types.ts',
    'app/src/services/nx-app-state.service.ts',
    'app/src/services/nx-bootstrap-provider.ts',
    'app/src/services/nx-cloud-api/custom-client-api.ts',
    'app/src/services/nx-cloud-api/nx-cloud-api.ts',
    'app/src/services/nx-config/base-config.ts',
    'app/src/services/nx-config/nx-config.service.ts',
    'app/src/services/nx-header.service.ts',
    'app/src/services/nx-language-provider.ts',
    'app/src/services/nx-static-cache.ts',
    'app/src/services/oauth.service.ts',
    'app/src/services/page.service.ts',
    'app/src/services/process.service/process.service.ts',
    'app/src/services/process.service/process.ts',
    'app/src/services/storage.service.ts',
    'app/src/services/sw-cache.service.ts',
    'app/src/services/system-api.service.ts',
    'app/src/services/system-api.types.ts',
    'app/src/services/system-groups-data.service.ts',
    'app/src/services/system-legacy-api.service.ts',
    'app/src/services/system-rest-api.service.ts',
    'app/src/services/system.service/camera-manager/camera-manager-types.ts',
    'app/src/services/system.service/camera-manager/camera-manager.ts',
    'app/src/services/system.service/server-manager/server-manager.ts',
    'app/src/services/system.service/storage-manager/current-storage-state.ts',
    'app/src/services/system.service/storage-manager/storage-manager.ts',
    'app/src/services/system.service/storage-manager/storage-state.ts',
    'app/src/services/system.service/storage-manager/storage.ts',
    'app/src/services/system.service/system-types.ts',
    'app/src/services/system.service/system.service.ts',
    'app/src/services/system.service/system.ts',
    'app/src/services/system.service/user-manager/user-manager.ts',
    'app/src/services/systems.service.ts',
    'app/src/services/uri.service.ts',
    'app/src/services/url-protocol.service.ts',
    'app/src/services/url-protocol.service.types.ts',
    'app/src/utils/logger.ts',
    'app/test.ts'
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
                'app/src/pages/debug/debug.component.html',
                'app/src/pages/email-notifications/email-notifications.component.html',
                'app/src/pages/layout/layout.component.html',
                'app/src/pages/push-notifications/push-notifications.component.html',
                'app/src/pages/sandbox/**/*',
                // Not required for internal/testing components
            ],
            rules: {
                // 'nx/template/require-translate': 'error',
                // TODO: Activate and apply fixes
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
