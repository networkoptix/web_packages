import { Dialog, DialogConfig } from '@angular/cdk/dialog';
import { ComponentType } from '@angular/cdk/overlay';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
    GenericEditModalContent,
    ModalContent,
} from '@components/console-table/console-table.component.types';
import staticLang from '@language_static';
// import { DashboardConfiguration } from '@pages/dashboard/dashboard-configuration';

import { DIALOG_SIZE } from './dialog-config-v2';
import * as Dt from './dialogs.types';
import { NewFeatureTemplate } from './new-feature/new-feature.component.types';

@Injectable({ providedIn: 'root' })
export class NxDialogsService {
    constructor(private cdkDialog: Dialog) {}

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // public async addWidget(
    //     gridSize: any,
    //     gridGap: any,
    //     widgets: any,
    //     dashboardMenu: DashboardConfiguration[],
    //     activeDashboard: any,
    //     updateSelectedDashboard: (id: string) => void,
    // ): Promise<any> {
    //     const component = await import('./add-widget/add-widget.component').then(
    //         m => m.AddWidgetModalContent,
    //     );
    //     const config: DialogConfig<any> = {
    //         width: DIALOG_SIZE.LARGE,
    //         data: {
    //             widgets,
    //             gridSize,
    //             gridGap,
    //             dashboardMenu,
    //             activeDashboard,
    //             updateSelectedDashboard,
    //         },
    //         disableClose: true,
    //         // Disable click outside and Esc to close for now until dialog
    //         // is properly migrated
    //     };

    //     return this.openV2<any, any>(component, config);
    // }

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

        return this.openV2<any, any>(component, { data, disableClose: true });
        // Also disabling close here
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

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
            return this.openV2(component, configWithData);
        };
    }

    /* General use */
    generic = this.dialogV2Factory<Dt.Generic>(() =>
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
        return this.openV2(component, dialogConfig);
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
        return this.openV2(component, dialogConfig);
    }

    async apply(data: Dt.Apply['data']): Promise<Dt.Apply['return']> {
        const component = await import('./apply/apply.component').then(m => m.ApplyModalContent);
        const dialogConfig: DialogConfig<Dt.Apply['data']> = {
            data: { ...data },
            disableClose: true,
            hasBackdrop: true,
        };
        return this.openV2(component, dialogConfig);
    }

    message = this.dialogV2Factory<Dt.Message>(
        () => import('./message/message.component').then(m => m.MessageModalContent),
        { autoFocus: '#message' },
    );

    tosUpdate = this.dialogV2Factory<Dt.TosUpdate>(
        () => import('./tos-update/tos-update.component').then(m => m.TosUpdateModalContent),
        { disableClose: true, width: DIALOG_SIZE.LARGE },
    );

    tosRejected = this.dialogV2Factory<Dt.TosRejected>(
        () => import('./tos-update/tos-rejected.component').then(m => m.TosRejectedModalContent),
        { disableClose: true, width: DIALOG_SIZE.NORMAL },
    );

    /* WebAdmin */
    wizard = this.dialogV2Factory<Dt.Wizard>(
        () => import('./wizard/wizard.component').then(m => m.WizardModalContent),
        { width: DIALOG_SIZE.SMALL, disableClose: true, hasBackdrop: false },
    );

    loginWebAdmin = this.dialogV2Factory<Dt.LoginWebAdmin>(
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

    temporaryUserLogin = this.dialogV2Factory<Dt.TemporaryUserLogin>(
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

    updateSession = this.dialogV2Factory<Dt.UpdateSession>(
        () =>
            import('./update-session/update-session.component').then(
                m => m.NxUpdateSessionModalContent,
            ),
        { disableClose: true },
    );

    client2faWarning = this.dialogV2Factory<Dt.Client2faWarning>(
        () =>
            import('./two-fa/client-2fa-warning/client-2fa-warning.component').then(
                m => m.Client2faWarningModalContent,
            ),
        { disableClose: true },
    );

    /* Account */
    account2faEnable = this.dialogV2Factory<Dt.EnableAccount2fa>(
        () =>
            import('./two-fa/enable-account-2fa/enable-account-2fa.component').then(
                m => m.NxEnableAccount2faModalContent,
            ),
        { width: DIALOG_SIZE.SMALL },
    );

    account2faDisable = this.dialogV2Factory<Dt.DisableAccount2fa>(
        () =>
            import('./two-fa/disable-account-2fa/disable-account-2fa.component').then(
                m => m.NxDisableAccount2faModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, autoFocus: 'input' },
    );

    account2faCodeToggle = this.dialogV2Factory<Dt.Require2faCodeOnLogin>(
        () =>
            import('./two-fa/require-code-on-login/require-code-on-login.component').then(
                m => m.NxRequire2faCodeOnLoginModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, restoreFocus: false, autoFocus: 'input' },
    );

    account2faNewBackupCodes = this.dialogV2Factory<Dt.New2faBackupCodes>(
        () =>
            import('./two-fa/new-backup-codes/new-backup-codes.component').then(
                m => m.NxNew2faBackupCodesModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, disableClose: true },
    );

    account2faPasswordChange = this.dialogV2Factory<Dt.PasswordChange2fa>(
        () =>
            import('./two-fa/password-change/password-change.component').then(
                m => m.NxPasswordChange2faModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, autoFocus: 'input' },
    );

    /* Systems */

    /* Channel partners */
    createChannelPartner = this.dialogV2Factory<Dt.AddChannelPartner>(
        () =>
            import('./channel-partners/add-partner/add-partner.component').then(
                m => m.AddPartnerModalContent,
            ),
        { autoFocus: 'input', width: '313px' },
    );

    updateChannelPartner = this.dialogV2Factory<Dt.EditChannelPartner>(() =>
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

    updatePartnerUser = this.dialogV2Factory<Dt.EditPartnerUser>(() =>
        import('./channel-partners/edit-partner-user/edit-partner-user.component').then(
            m => m.NxEditPartnerUserModalContent,
        ),
    );

    createOrganization = this.dialogV2Factory<Dt.AddOrganization>(
        () =>
            import('./channel-partners/add-organization/add-organization.component').then(
                m => m.AddOrganizationModalContent,
            ),
        { autoFocus: 'input' },
    );

    updateOrganization = this.dialogV2Factory<Dt.EditOrganization>(() =>
        import('./channel-partners/edit-organization/edit-organization.component').then(
            m => m.NxEditOrganizationModalContent,
        ),
    );

    addOrgUser = this.dialogV2Factory<Dt.AddOrgUser>(() =>
        import('./channel-partners/add-org-user/add-org-user.component').then(
            m => m.NxAddOrgUserModalContent,
        ),
    );

    editOrgUser = this.dialogV2Factory<Dt.EditOrgUser>(() =>
        import('./channel-partners/edit-org-user/edit-org-user.component').then(
            m => m.NxEditOrgUserModalContent,
        ),
    );

    changeCpState = this.dialogV2Factory<Dt.ChangeCpState>(() =>
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
            width: '360px',
        },
    );

    moveGroupItem = this.dialogV2Factory<Dt.MoveGroupItem>(
        () =>
            import('./channel-partners/move-group-item/move-group-item.component').then(
                m => m.MoveGroupItemModalContent,
            ),
        { width: '360px' },
    );

    moveSystemItem = this.dialogV2Factory<Dt.MoveSystemItem>(
        () =>
            import('./channel-partners/move-system-item/move-system-item.component').then(
                m => m.MoveSystemItemModalContent,
            ),
        { width: '360px' },
    );

    addOrgUserV2 = this.dialogV2Factory<Dt.AddOrgUserV2>(
        () =>
            import('./channel-partners/add-org-user-v2/add-org-user-v2.component').then(
                m => m.NxAddOrgUserV2ModalContent,
            ),
        { width: '360px' },
    );

    changeService = this.dialogV2Factory<Dt.ChangeService>(
        () =>
            import('./channel-partners/change-service/change-service.component').then(
                m => m.NxChangeServiceModalContent,
            ),
        { width: '400px' },
    );

    /* Channel Partner Reports */

    viewUsageDetails = this.dialogV2Factory<Dt.ViewUsageDetails>(
        () =>
            import('./channel-partners/view-usage-details/view-usage-details.component').then(
                m => m.NxUsageDetailsModalContent,
            ),
        { width: DIALOG_SIZE.EXTRA_LARGE },
    );

    /* Admin */
    connectLocalToCloud = this.dialogV2Factory<Dt.ConnectLocalToCloud>(() =>
        import('./connect-cloud/connect-cloud.component').then(m => m.ConnectCloudModalContent),
    );

    disconnect = this.dialogV2Factory<Dt.Disconnect>(() =>
        import('./disconnect/disconnect.component').then(m => m.DisconnectModalContent),
    );

    removeSystem = this.dialogV2Factory<Dt.RemoveSystem>(
        () =>
            import('./remove-system/remove-system.component').then(m => m.RemoveSystemModalContent),
        { autoFocus: 'input' },
    );

    merge = this.dialogV2Factory<Dt.MergeRefactored>(
        () => import('./merge/merge.component').then(m => m.MergeModalContent),
        { disableClose: true },
    );

    mergeRefactored = this.dialogV2Factory<Dt.MergeRefactored>(() =>
        import('./merge/merge.refactor.component').then(m => m.NxMergeComponent),
    );

    toggleSystem2fa = this.dialogV2Factory<Dt.ToggleSystem2fa>(
        () =>
            import('./two-fa/toggle-system-2fa/toggle-system-2fa.component').then(
                m => m.ToggleSystem2faModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, autoFocus: 'input' },
    );

    cantEnableSystem2fa = this.dialogV2Factory<Dt.CantEnableSystem2fa>(
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
        { width: '420px' },
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
    updateCameraCredentials = this.dialogV2Factory<Dt.UpdateCameraCredentials>(
        () =>
            import('./update-camera-credentials/update-camera-credentials.component').then(
                m => m.UpdateCameraCredentialsModalContent,
            ),
        { autoFocus: 'input' },
    );

    /* Users */
    addUser = this.dialogV2Factory<Dt.AddUser>(() =>
        import('./add-user/add-user.component').then(m => m.AddUserModalContent),
    );

    removeUser = this.dialogV2Factory<Dt.RemoveUser>(() =>
        import('./remove-user/remove-user.component').then(m => m.RemoveUserModalContent),
    );

    deleteCloudUser = this.dialogV2Factory<Dt.DeleteCloudUser>(
        () =>
            import('./delete-cloud-user/delete-cloud-user.component').then(
                m => m.DeleteCloudUserModalContent,
            ),
        { autoFocus: 'input' },
    );

    changePassword = this.dialogV2Factory<Dt.ChangePassword>(() =>
        import('./change-password/change-password.component').then(
            m => m.ChangePasswordModalContent,
        ),
    );

    /* Servers */
    restartServer = this.dialogV2Factory<Dt.RestartServer>(() =>
        import('./restart-server/restart-server.component').then(m => m.RestartServerModalContent),
    );

    resetServer = this.dialogV2Factory<Dt.ResetServer>(() =>
        import('./reset-server/reset-server.component').then(m => m.ResetServerModalContent),
    );

    detachServer = this.dialogV2Factory<Dt.DetachServer>(() =>
        import('./detach-server/detach-server.component').then(m => m.DetachServerModalContent),
    );

    /* Storage */
    addStorage = this.dialogV2Factory<Dt.AddStorage>(() =>
        import('./add-storage/add-storage.component').then(m => m.AddStorageModalContent),
    );

    changeStorage = this.dialogV2Factory<Dt.ChangeStorage>(() =>
        import('./change-storage/change-storage.component').then(m => m.ChangeStorageModalContent),
    );

    reserveSpaceWarning = this.dialogV2Factory<Dt.ReserveSpaceWarning>(() =>
        import('./reserve-space-warning/reserve-space-warning.component').then(
            m => m.ReserveSpaceWarningModalContent,
        ),
    );

    resetBackupSettings = this.dialogV2Factory<Dt.ResetBackup>(() =>
        import('./reset-backup/reset-backup.component').then(m => m.ResetBackupModalContent),
    );

    /* Bookmarks */
    moreDevices = this.dialogV2Factory<Dt.MoreDevices>(
        () =>
            import('./bookmarks/more-devices/more-devices.component').then(
                m => m.NxMoreDevicesModalContent,
            ),
        { width: DIALOG_SIZE.INFO, autoFocus: 'input', panelClass: 'no-container-shadow' },
    );

    moreTags = this.dialogV2Factory<Dt.MoreTags>(
        () =>
            import('./bookmarks/more-tags/more-tags.component').then(m => m.NxMoreTagsModalContent),
        { width: DIALOG_SIZE.INFO, autoFocus: 'input', panelClass: 'no-container-shadow' },
    );

    bookmarkDetails = this.dialogV2Factory<Dt.BookmarkDetails>(
        () =>
            import('./bookmarks/card-modal/bookmarks-card-modal.component').then(
                m => m.NxBookmarksCardModalComponent,
            ),
        { panelClass: 'no-container-shadow' },
    );

    bookmarkDownload = this.dialogV2Factory<Dt.BookmarkDownload>(
        () =>
            import('./bookmarks/download-modal/bookmark-download.component').then(
                m => m.NxBookmarkDownloadComponent,
            ),
        { width: '367px', height: '176px' },
    );

    bookmarkShare = this.dialogV2Factory<Dt.BookmarkShare>(
        () =>
            import('./bookmarks/share-modal/bookmark-share.component').then(
                m => m.NxBookmarkShareComponent,
            ),
        { width: '600px' },
    );

    filterShowMore = this.dialogV2Factory<Dt.ShowMoreFilters>(
        () => import('./filters/show-more.component').then(m => m.NxShowMoreFiltersComponent),
        { width: DIALOG_SIZE.INFO, autoFocus: 'input', panelClass: 'no-container-shadow' },
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
            return this.openV2(component, configWithData);
        };
    }

    cloudStorageInfo = this.newFeatureFactory<Dt.CloudStorageInfoData>(
        NewFeatureTemplate.CloudStorage,
    );
    cloudLayoutsInfo = this.newFeatureFactory<Dt.CloudLayoutsInfoData>(
        NewFeatureTemplate.CloudLayouts,
    );

    /* View */
    selectTimeRange = this.dialogV2Factory<Dt.SelectTimeRange>(
        () =>
            import('./select-time-range-native-fallback/select-time-range.component').then(
                m => m.SelectTimeRangeModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, autoFocus: 'input' },
    );

    selectWebGlTimeRange = this.dialogV2Factory<Dt.WebGlSelectTimeRange>(
        () =>
            import('./webgl-select-time-range/select-time-range.component').then(
                m => m.WebGlSelectTimeRangeModalContent,
            ),
        { width: DIALOG_SIZE.SMALL, autoFocus: 'input' },
    );
}
