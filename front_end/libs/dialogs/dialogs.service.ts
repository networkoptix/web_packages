import { Dialog, DialogConfig } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
    GenericEditModalContent,
    ModalContent,
} from '@components/console-table/console-table.component.types';
import staticLang from '@language_static';
import { DashboardConfiguration } from '@pages/dashboard/dashboard-configuration';

import { DIALOG_SIZE } from './dialog-config-v2';
import * as Dt from './dialogs.types';
import { NewFeatureTemplate } from './new-feature/new-feature.component.types';

@Injectable({ providedIn: 'root' })
export class NxDialogsService {
    constructor(private cdkDialog: Dialog) {}

    /* eslint-disable @typescript-eslint/no-explicit-any */
    public async addWidget(
        gridSize: any,
        gridGap: any,
        widgets: any,
        dashboardMenu: DashboardConfiguration[],
        activeDashboard: any,
        updateSelectedDashboard: (id: string) => void,
    ): Promise<any> {
        const component = await import('./add-widget/add-widget.component').then(
            m => m.AddWidgetModalContent,
        );
        const config: DialogConfig<any> = {
            width: DIALOG_SIZE.LARGE,
            data: {
                widgets,
                gridSize,
                gridGap,
                dashboardMenu,
                activeDashboard,
                updateSelectedDashboard,
            },
            disableClose: true,
            // Disable click outside and Esc to close for now until dialog
            // is properly migrated
        };

        return this.openV1<any, any>(component, config);
    }

    public async edit(genericEditModalContent: GenericEditModalContent);
    public async edit(
        genericEditModalContent: GenericEditModalContent,
        values: Record<string, unknown>,
    );
    public async edit(contextModalContent: ModalContent);
    public async edit(
        modalContent: ModalContent | GenericEditModalContent,
        values: any = {},
    ): Promise<unknown> {
        const isGeneric = 'contextManifest' in modalContent;

        let data: any;

        if (isGeneric) {
            const { contextManifest } = modalContent;
            data = {
                ...modalContent,
                contextList: [contextManifest],
                value: modalContent.values || values,
                manifest: contextManifest,
                heading: contextManifest?.name || contextManifest.label,
            };
        } else {
            data = { ...modalContent };
        }

        const component = await import('./edit/edit.component').then(m => m.EditModalContent);

        return this.openV1<any, any>(component, { data, disableClose: true });
        // Also disabling close here
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    /** @deprecated For backwards compatibility with legacy styling */
    private openV1<R, D = never, T = unknown>(
        component: ComponentType<T>,
        customconfig: DialogConfig<D> = {},
    ): Promise<R> {
        const dialogConfig: DialogConfig<D> = {
            width: DIALOG_SIZE.NORMAL, // Default width
            ...customconfig,
        };

        const { panelClass } = dialogConfig;
        if (panelClass) {
            dialogConfig.panelClass = (
                typeof panelClass === 'string' ? [panelClass] : panelClass
            ).concat('nx-legacy-dialog-style');
        } else {
            dialogConfig.panelClass = 'nx-legacy-dialog-style';
        }

        return firstValueFrom(this.cdkDialog.open<R, D>(component, dialogConfig).closed);
    }

    /** @deprecated For backwards compatibility with legacy styling */
    private dialogV1Factory<DT extends Dt.DialogType, CT = unknown>(
        componentPromise: () => Promise<ComponentType<CT>>,
        staticConfig: DialogConfig<never> = {},
    ): (
        data: DT['data'] extends void ? null | void : DT['data'],
        instanceConfig?: DialogConfig<never>,
    ) => Promise<DT['return']> {
        return async (data, instanceConfig = {}) => {
            const component = await componentPromise();
            const configWithData: DialogConfig<DT['data']> = {
                ...staticConfig,
                ...instanceConfig,
                data,
            };
            configWithData.autoFocus ??= 'dialog';
            return this.openV1(component, configWithData);
        };
    }

    private openV2<R, D = never, T = unknown>(
        component: ComponentType<T>,
        customconfig: DialogConfig<D> = {},
    ): Promise<R> {
        const dialogConfig: DialogConfig<D> = {
            width: DIALOG_SIZE.NORMAL, // Default width
            ...customconfig,
        };
        return firstValueFrom(this.cdkDialog.open<R, D>(component, dialogConfig).closed);
    }

    /** Factory that creates a function to lazily open a dialog
     *
     * @param componentPromise Function that lazy imports the modal content
     * @param staticConfig Base config that will be applied to all instances of the dialog
     *     https://material.angular.io/cdk/dialog/api#DialogConfig
     * @returns A function to open the dialog
     */
    private dialogV2Factory<DT extends Dt.DialogType, CT = unknown>(
        componentPromise: () => Promise<ComponentType<CT>>,
        staticConfig: DialogConfig<never> = {},
    ): (
        data: DT['data'] extends void ? null | void : DT['data'],
        instanceConfig?: DialogConfig<never>,
    ) => Promise<DT['return']> {
        /**
         * @param data Data to be passed to the dialog instance. For dialogs where this type
         *     is `void`, use `null` to provide `instanceConfig`
         * @param instanceConfig Config applied to the dialog instance, can overwrite static config
         * @returns The return value from the dialog instance
         */
        return async (data, instanceConfig = {}) => {
            const component = await componentPromise();
            const configWithData: DialogConfig<DT['data']> = {
                ...staticConfig,
                ...instanceConfig,
                data,
            };
            configWithData.autoFocus ??= 'dialog';
            /* By default the CDK will focus the first focusable element in the dialog,
            which is usually the close button */
            return this.openV2(component, configWithData);
        };
    }

    /* General use */
    generic = this.dialogV1Factory<Dt.Generic>(() =>
        import('./generic/generic.component').then(m => m.GenericModalContent),
    );

    async alert(data: Dt.Alert['data'], instanceConfig: DialogConfig<never> = {}): Promise<void> {
        const component = await import('./generic/generic.component').then(
            m => m.GenericModalContent,
        );
        const dialogConfig: DialogConfig<Dt.Generic['data']> = {
            ...instanceConfig,
            data: { ...data, footer: { actionable: false, ...(data.footer ?? {}) } },
            // Only close button
        };
        return this.openV1(component, dialogConfig);
    }

    async confirm(
        data: Dt.Confirm['data'],
        instanceConfig: DialogConfig<never> = {},
    ): Promise<Dt.Confirm['return']> {
        const component = await import('./generic/generic.component').then(
            m => m.GenericModalContent,
        );
        const dialogConfig: DialogConfig<Dt.Generic['data']> = {
            ...instanceConfig,
            data: { ...data, footer: { actionable: true, ...data.footer } },
            // With action/cancel buttons
        };
        return this.openV1(component, dialogConfig);
    }

    apply = this.dialogV1Factory<Dt.Apply>(
        () => import('./apply/apply.component').then(m => m.ApplyModalContent),
        { disableClose: true },
    );

    message = this.dialogV1Factory<Dt.Message>(
        () => import('./message/message.component').then(m => m.MessageModalContent),
        { autoFocus: '#message' },
    );

    tosUpdate = this.dialogV1Factory<Dt.TosUpdate>(
        () => import('./tos-update/tos-update.component').then(m => m.TosUpdateModalContent),
        { disableClose: true, width: DIALOG_SIZE.LARGE },
    );

    tosRejected = this.dialogV1Factory<Dt.TosRejected>(
        () => import('./tos-update/tos-rejected.component').then(m => m.TosRejectedModalContent),
        { disableClose: true, width: DIALOG_SIZE.NORMAL },
    );

    /* WebAdmin */
    wizard = this.dialogV1Factory<Dt.Wizard>(
        () => import('./wizard/wizard.component').then(m => m.WizardModalContent),
        { width: DIALOG_SIZE.SMALL, disableClose: true, hasBackdrop: false },
    );

    loginWebAdmin = this.dialogV1Factory<Dt.LoginWebAdmin>(
        () =>
            import('./login-webadmin/login-webadmin.component').then(
                m => m.LoginWebadminModalContent,
            ),
        {
            width: DIALOG_SIZE.SMALL,
            disableClose: true,
            hasBackdrop: false,
        },
    );

    temporaryUserLogin = this.dialogV1Factory<Dt.TemporaryUserLogin>(
        () =>
            import('./temporary-auth-login/temporary-auth-login.component').then(
                m => m.TemporaryAuthLoginComponent,
            ),
        {
            width: DIALOG_SIZE.SMALL,
            disableClose: true,
            hasBackdrop: false,
            panelClass: 'no-container-background',
        },
    );

    /* Auth */
    async expiredSession(): Promise<Dt.Confirm['return']> {
        return this.confirm({
            disableClose: true,
            title: staticLang.dialogs.renewAuth.title,
            message: staticLang.dialogs.renewAuth.message,
            footer: { actionLabel: staticLang.dialogs.buttons.ok },
        });
    }

    updateSession = this.dialogV1Factory<Dt.UpdateSession>(
        () =>
            import('./update-session/update-session.component').then(
                m => m.NxUpdateSessionModalContent,
            ),
        { disableClose: true },
    );

    client2faWarning = this.dialogV1Factory<Dt.Client2faWarning>(
        () =>
            import('./two-fa/client-2fa-warning/client-2fa-warning.component').then(
                m => m.Client2faWarningModalContent,
            ),
        { disableClose: true },
    );

    /* Account */
    account2faEnable = this.dialogV1Factory<Dt.EnableAccount2fa>(
        () =>
            import('./two-fa/enable-account-2fa/enable-account-2fa.component').then(
                m => m.NxEnableAccount2faModalContent,
            ),
        { width: DIALOG_SIZE.SMALL },
    );

    account2faDisable = this.dialogV1Factory<Dt.DisableAccount2fa>(
        () =>
            import('./two-fa/disable-account-2fa/disable-account-2fa.component').then(
                m => m.NxDisableAccount2faModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, autoFocus: 'input' },
    );

    account2faCodeToggle = this.dialogV1Factory<Dt.Require2faCodeOnLogin>(
        () =>
            import('./two-fa/require-code-on-login/require-code-on-login.component').then(
                m => m.NxRequire2faCodeOnLoginModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, restoreFocus: false, autoFocus: 'input' },
    );

    account2faNewBackupCodes = this.dialogV1Factory<Dt.New2faBackupCodes>(
        () =>
            import('./two-fa/new-backup-codes/new-backup-codes.component').then(
                m => m.NxNew2faBackupCodesModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, disableClose: true },
    );

    account2faPasswordChange = this.dialogV1Factory<Dt.PasswordChange2fa>(
        () =>
            import('./two-fa/password-change/password-change.component').then(
                m => m.NxPasswordChange2faModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, autoFocus: 'input' },
    );

    /* Systems */

    /* Channel partners */
    createChannelPartner = this.dialogV1Factory<Dt.AddChannelPartner>(
        () =>
            import('./channel-partners/add-partner/add-partner.component').then(
                m => m.AddPartnerModalContent,
            ),
        { autoFocus: 'input', width: '313px' },
    );

    updateChannelPartner = this.dialogV1Factory<Dt.EditChannelPartner>(() =>
        import('./channel-partners/edit-partner/edit-partner.component').then(
            m => m.NxEditPartnerModalContent,
        ),
    );

    addPartnerUser = this.dialogV2Factory<Dt.AddPartnerUser>(
        () =>
            import('./channel-partners/add-partner-user/add-partner-user.component').then(
                m => m.AddPartnerUserModalContent,
            ),
        { width: DIALOG_SIZE.EXTRA_SMALL },
    );

    updatePartnerUser = this.dialogV1Factory<Dt.EditPartnerUser>(() =>
        import('./channel-partners/edit-partner-user/edit-partner-user.component').then(
            m => m.NxEditPartnerUserModalContent,
        ),
    );

    createOrganization = this.dialogV2Factory<Dt.AddOrganization>(
        () =>
            import('./channel-partners/add-organization/add-organization.component').then(
                m => m.AddOrganizationModalContent,
            ),
        { autoFocus: 'input', width: DIALOG_SIZE.MICRO_SMALL },
    );

    updateOrganization = this.dialogV1Factory<Dt.EditOrganization>(() =>
        import('./channel-partners/edit-organization/edit-organization.component').then(
            m => m.NxEditOrganizationModalContent,
        ),
    );

    addSystemTutorial = this.dialogV2Factory<Dt.AddSystemTutorial>(
        () =>
            import('./channel-partners/tutorial-dialog/tutorial-dialog.component').then(
                m => m.NxTutorialDialogComponent,
            ),
        { width: DIALOG_SIZE.ACTION },
    );

    addOrgUser = this.dialogV1Factory<Dt.AddOrgUser>(() =>
        import('./channel-partners/add-org-user/add-org-user.component').then(
            m => m.NxAddOrgUserModalContent,
        ),
    );

    filterUsers = this.dialogV1Factory<Dt.FilterUsers>(
        () =>
            import('@dialogs/channel-partners/filter-users/filter-users.component').then(
                m => m.NxFilterUsersModalContent,
            ),
        { autoFocus: '#filterByEmailComponent' },
    );

    editOrgUser = this.dialogV1Factory<Dt.EditOrgUser>(() =>
        import('./channel-partners/edit-org-user/edit-org-user.component').then(
            m => m.NxEditOrgUserModalContent,
        ),
    );

    changeCpState = this.dialogV1Factory<Dt.ChangeCpState>(() =>
        import('./channel-partners/change-state/change-state.component').then(
            m => m.NxChangeStateModalContent,
        ),
    );

    createSystemGroup = this.dialogV2Factory<Dt.CreateSystemGroup>(
        () =>
            import('./channel-partners/create-system-group/create-system-group.component').then(
                m => m.CreateSystemGroupModalContent,
            ),
        { autoFocus: 'input', width: DIALOG_SIZE.MICRO_SMALL },
    );

    updateGroupName = this.dialogV2Factory<Dt.UpdateSystemGroup>(
        () =>
            import('./channel-partners/update-system-group/update-system-group.component').then(
                m => m.UpdateSystemGroupModalContent,
            ),
        {
            autoFocus: 'input',
            width: DIALOG_SIZE.MICRO_SMALL,
        },
    );

    moveGroupItem = this.dialogV2Factory<Dt.MoveGroupItem>(
        () =>
            import('./channel-partners/move-group-item/move-group-item.component').then(
                m => m.MoveGroupItemModalContent,
            ),
        { width: '360px', autoFocus: 'input' },
    );

    moveSystemItem = this.dialogV1Factory<Dt.MoveSystemItem>(
        () =>
            import('./channel-partners/move-system-item/move-system-item.component').then(
                m => m.MoveSystemItemModalContent,
            ),
        { width: '360px', autoFocus: 'input' },
    );

    addOrgUserV2 = this.dialogV2Factory<Dt.AddOrgUserV2>(
        () =>
            import('./channel-partners/add-org-user-v2/add-org-user-v2.component').then(
                m => m.NxAddOrgUserV2ModalContent,
            ),
        { width: '360px' },
    );

    changeService = this.dialogV1Factory<Dt.ChangeService>(
        () =>
            import('./channel-partners/change-service/change-service.component').then(
                m => m.NxChangeServiceModalContent,
            ),
        { width: DIALOG_SIZE.SMALL },
    );

    /* Channel Partner Reports */

    viewRegularServiceDetails = this.dialogV1Factory<Dt.ViewRegularServiceDetails>(
        () =>
            import(
                './channel-partners/view-regular-service-details/regular-service-details-dialog.component'
            ).then(m => m.NxRegularServiceDetailsDialog),
        { width: DIALOG_SIZE.EXTRA_LARGE },
    );

    viewExpiringServiceDetails = this.dialogV1Factory<Dt.ViewExpiringServiceDetails>(
        () =>
            import(
                './channel-partners/view-expiring-service-details/expiring-service-details-dialog.component'
            ).then(m => m.NxExpiringServiceDetailsDialog),
        { width: DIALOG_SIZE.EXTRA_LARGE },
    );

    cancelReportExport = this.dialogV2Factory<Dt.CancelReportExport>(
        () =>
            import('./channel-partners/cancel-report-export/cancel-report-export.component').then(
                m => m.NxCancelExportDialog,
            ),
        { width: DIALOG_SIZE.SMALL },
    );

    /* Admin */
    connectLocalToCloud = this.dialogV1Factory<Dt.ConnectLocalToCloud>(() =>
        import('./connect-cloud/connect-cloud.component').then(m => m.ConnectCloudModalContent),
    );

    disconnect = this.dialogV1Factory<Dt.Disconnect>(() =>
        import('./disconnect/disconnect.component').then(m => m.DisconnectModalContent),
    );

    removeSystem = this.dialogV1Factory<Dt.RemoveSystem>(
        () =>
            import('./remove-system/remove-system.component').then(m => m.RemoveSystemModalContent),
        { autoFocus: 'input' },
    );

    merge = this.dialogV1Factory<Dt.MergeRefactored>(
        () => import('./merge/merge.component').then(m => m.MergeModalContent),
        { disableClose: true },
    );

    mergeRefactored = this.dialogV1Factory<Dt.MergeRefactored>(() =>
        import('./merge/merge.refactor.component').then(m => m.NxMergeComponent),
    );

    toggleSystem2fa = this.dialogV1Factory<Dt.ToggleSystem2fa>(
        () =>
            import('./two-fa/toggle-system-2fa/toggle-system-2fa.component').then(
                m => m.ToggleSystem2faModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, autoFocus: 'input' },
    );

    cantEnableSystem2fa = this.dialogV1Factory<Dt.CantEnableSystem2fa>(
        () =>
            import('./two-fa/cant-enable-system-2fa/cant-enable-system-2fa.component').then(
                m => m.NxCantEnableSystem2faModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, disableClose: true },
    );

    transferOwnership = this.dialogV2Factory<Dt.TransferOwnership>(
        () =>
            import('./transfer-ownership/transfer-ownership.component').then(
                m => m.TransferOwnershipModalContent,
            ),
        { width: '420px', autoFocus: 'dialog' },
    );

    /* Cloud storage */
    private cloudStorageFactory<CT>(
        componentPromise: () => Promise<ComponentType<CT>>,
        customConfig: DialogConfig<never> = {},
    ): (data: Dt.CloudStorage['data']) => Promise<Dt.CloudStorage['return']> {
        return async data => {
            const component = await componentPromise();
            const configWithData: DialogConfig<Dt.CloudStorage['data']> = {
                width: DIALOG_SIZE.ACTION,
                ...customConfig,
                data,
            };
            return this.openV2(component, configWithData);
        };
    }

    cloudStorageActivate = this.cloudStorageFactory(() =>
        import('./cloud-storage/activate/cloud-storage-activate.component').then(
            m => m.CloudStorageActivateModalContent,
        ),
    );

    cloudStorageUpdate = this.cloudStorageFactory(() =>
        import('./cloud-storage/modify/cloud-storage-modify.component').then(
            m => m.CloudStorageModifyModalContent,
        ),
    );

    cloudStorageDelete = this.cloudStorageFactory(() =>
        import('./cloud-storage/delete/cloud-storage-delete.component').then(
            m => m.CloudStorageDeleteModalContent,
        ),
    );

    cloudStorageMigrate = this.cloudStorageFactory(() =>
        import('./cloud-storage/move/cloud-storage-move.component').then(
            m => m.CloudStorageMoveModalContent,
        ),
    );

    /* Cameras */
    updateCameraCredentials = this.dialogV1Factory<Dt.UpdateCameraCredentials>(
        () =>
            import('./update-camera-credentials/update-camera-credentials.component').then(
                m => m.UpdateCameraCredentialsModalContent,
            ),
        { autoFocus: 'input' },
    );

    /* Users */
    addUser = this.dialogV1Factory<Dt.AddUser>(() =>
        import('./add-user/add-user.component').then(m => m.AddUserModalContent),
    );

    removeUser = this.dialogV1Factory<Dt.RemoveUser>(() =>
        import('./remove-user/remove-user.component').then(m => m.RemoveUserModalContent),
    );

    deleteCloudUser = this.dialogV1Factory<Dt.DeleteCloudUser>(
        () =>
            import('./delete-cloud-user/delete-cloud-user.component').then(
                m => m.DeleteCloudUserModalContent,
            ),
        { autoFocus: 'input' },
    );

    changePassword = this.dialogV1Factory<Dt.ChangePassword>(() =>
        import('./change-password/change-password.component').then(
            m => m.ChangePasswordModalContent,
        ),
    );

    /* Servers */
    restartServer = this.dialogV1Factory<Dt.RestartServer>(() =>
        import('./restart-server/restart-server.component').then(m => m.RestartServerModalContent),
    );

    resetServer = this.dialogV1Factory<Dt.ResetServer>(() =>
        import('./reset-server/reset-server.component').then(m => m.ResetServerModalContent),
    );

    detachServer = this.dialogV1Factory<Dt.DetachServer>(() =>
        import('./detach-server/detach-server.component').then(m => m.DetachServerModalContent),
    );

    /* Storage */
    addStorage = this.dialogV1Factory<Dt.AddStorage>(() =>
        import('./add-storage/add-storage.component').then(m => m.AddStorageModalContent),
    );

    changeStorage = this.dialogV1Factory<Dt.ChangeStorage>(() =>
        import('./change-storage/change-storage.component').then(m => m.ChangeStorageModalContent),
    );

    reserveSpaceWarning = this.dialogV1Factory<Dt.ReserveSpaceWarning>(() =>
        import('./reserve-space-warning/reserve-space-warning.component').then(
            m => m.ReserveSpaceWarningModalContent,
        ),
    );

    resetBackupSettings = this.dialogV1Factory<Dt.ResetBackup>(() =>
        import('./reset-backup/reset-backup.component').then(m => m.ResetBackupModalContent),
    );

    /* Bookmarks */
    moreDevices = this.dialogV1Factory<Dt.MoreDevices>(
        () =>
            import('./bookmarks/more-devices/more-devices.component').then(
                m => m.NxMoreDevicesModalContent,
            ),
        { width: DIALOG_SIZE.INFO, autoFocus: 'input', panelClass: 'no-container-shadow' },
    );

    moreTags = this.dialogV1Factory<Dt.MoreTags>(
        () =>
            import('./bookmarks/more-tags/more-tags.component').then(m => m.NxMoreTagsModalContent),
        { width: DIALOG_SIZE.INFO, autoFocus: 'input', panelClass: 'no-container-shadow' },
    );

    bookmarkDetails = this.dialogV1Factory<Dt.BookmarkDetails>(
        () =>
            import('./bookmarks/card-modal/bookmarks-card-modal.component').then(
                m => m.NxBookmarksCardModalComponent,
            ),
        { panelClass: 'no-container-shadow' },
    );

    bookmarkDownload = this.dialogV1Factory<Dt.BookmarkDownload>(
        () =>
            import('./bookmarks/download-modal/bookmark-download.component').then(
                m => m.NxBookmarkDownloadComponent,
            ),
        { width: '367px', height: '176px' },
    );

    /* New feature */
    /**
     * Factory to create method for the new feature information modal.
     *
     * For hard coded views use the template enum, for dynamic view pass a TemplateRef.
     */
    private newFeatureFactory<D extends Dt.NewFeatureData>(
        content: D['content'],
        customConfig: DialogConfig<never> = {},
    ): (otherData: D['data']) => Promise<Dt.NewFeature['return']> {
        return async otherData => {
            const component = await import('./new-feature/new-feature.component').then(
                m => m.NewFeatureInformationModalContent,
            );
            const data = { content, data: otherData } as D;
            const configWithData: DialogConfig<D> = {
                width: DIALOG_SIZE.INFO,
                ...customConfig,
                data,
            };
            return this.openV1(component, configWithData);
        };
    }

    cloudStorageInfo = this.newFeatureFactory<Dt.CloudStorageInfoData>(
        NewFeatureTemplate.CloudStorage,
    );
    cloudLayoutsInfo = this.newFeatureFactory<Dt.CloudLayoutsInfoData>(
        NewFeatureTemplate.CloudLayouts,
    );

    /* View */
    selectTimeRange = this.dialogV1Factory<Dt.SelectTimeRange>(
        () =>
            import('./select-time-range-native-fallback/select-time-range.component').then(
                m => m.SelectTimeRangeModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, autoFocus: 'input' },
    );

    selectWebGlTimeRange = this.dialogV1Factory<Dt.WebGlSelectTimeRange>(
        () =>
            import('./webgl-select-time-range/select-time-range.component').then(
                m => m.WebGlSelectTimeRangeModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, autoFocus: 'input' },
    );
}
