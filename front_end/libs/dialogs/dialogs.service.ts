import { Dialog, DialogConfig as CdkDialogConfig } from '@angular/cdk/dialog';
import { ComponentType, Overlay } from '@angular/cdk/overlay';
import { Location } from '@angular/common';
import { Injectable, Injector, TemplateRef } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike, firstValueFrom } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { GenericEditModalContent, ModalContent } from '@components/console-table/console-table.component.types';
import { DashboardConfiguration } from '@pages/dashboard/dashboard-configuration';
import { Translatable } from '@pipes/any-translate.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { CloudStorageManager } from '@services/system.service/cloud-storage-manager/cloud-storage-manager';
import { LicenseManager } from '@services/system.service/license-manager/licence-manager';
import { StorageManager } from '@services/system.service/storage-manager/storage-manager';
import type { NxSystem } from '@services/system.service/system';
import type { NxUser } from '@services/system.service/user-manager/user-manager-types';
import { NxSystemInfo } from '@services/systems.service.types';
import { pickFrom } from '@utils/general';
import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';

import { toast } from '../variables/static-variables';

import { DialogBase } from './dialog-base';
import { DialogConfig } from './dialog-config';
import { DIALOG_SIZE as DIALOG_SIZE_V2 } from './dialog-config-v2';
import { DIALOG_SIZE, defaultConfig, infoDialogConfig, cloudStorageActionDialogConfig } from './dialog-ref';
import * as Dt from './dialogs.types';
import { NxToastService } from './toast.service';
import { TfaAction } from './two-fa/two-fa.component.types';

@UntilDestroy({ checkProperties: true })
@Injectable({ providedIn: 'root' })
export class NxDialogsService extends DialogBase {
    LANG = staticLang;
    CONFIG: IConfig;
    location: Location;
    closeResult: string;

    languageSubscription: SubscriptionLike;

    constructor(
        configService: NxConfigService,
        location: Location,
        injector: Injector,
        overlay: Overlay,
        private toastService: NxToastService,
        private cdkDialog: Dialog,
    ) {
        super(overlay, injector);
        this.CONFIG = configService.getConfig();
        this.location = location;
    }

    public ngOnDestroy(): void {
    }

    public dismiss(): void {
        this.toastService.remove();
    }

    public notify(
        message: Translatable,
        type: string = toast.info,
        hold?: boolean
    ): void {
        this.toastService.show(message, type, { autohide: !hold });
    }

    public async addWidget(gridSize, gridGap, widgets, dashboardMenu: DashboardConfiguration[], activeDashboard, updateSelectedDashboard: (id: string) => void) {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.LARGE,
            data: {
                widgets,
                gridSize,
                gridGap,
                dashboardMenu,
                activeDashboard,
                updateSelectedDashboard,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./add-widget/add-widget.component').then(m => m.AddWidgetModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async addStorage(
        serverId: string,
        storageManager: StorageManager,
        cancelPolls: () => any
    ) {
        const config: Partial<DialogConfig> = {
            data: {
                serverId,
                storageManager,
                cancelPolls,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./add-storage/add-storage.component').then(m => m.AddStorageModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async edit(genericEditModalContent: GenericEditModalContent);
    public async edit(genericEditModalContent: GenericEditModalContent, values: Record<string, unknown>);
    public async edit(contextModalContent: ModalContent);
    public async edit(modalContent: ModalContent | GenericEditModalContent, values = {}): Promise<unknown> {
        const isGeneric = 'contextManifest' in modalContent;
        const config: Partial<DialogConfig> = {
            data: {}
        };

        if (isGeneric) {
            pickFrom(
                modalContent,
                Object.keys(new GenericEditModalContent(null, null)) as (keyof GenericEditModalContent)[],
                config.data
            );

            config.data.contextList = [modalContent.contextManifest];
            config.data.values ||= values;
            config.data.manifest = modalContent.contextManifest;
            config.data.heading = modalContent.contextManifest?.name || modalContent.contextManifest.label;
        } else {
            pickFrom(
                modalContent,
                Object.keys(new ModalContent(null)) as (keyof ModalContent)[],
                config.data
            );
        }
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./edit/edit.component').then(m => m.EditModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    // Not used at this moment
    public downloadAsync(modalContent: ModalContent): void {
        // const options: IParams = {
        //     windowClass: 'modal-holder',
        //     backdrop: 'static'
        // };
        // return this.createModal(DownloadAsyncModalContent, options, modalContent);

        // const config: Partial<DialogConfig> = {
        //      data: {
        //          modalContent
        //      }
        // };
        // const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);
        //
        // return this.open(DownloadAsyncModalContent, dialogConfig)
        //     .afterClosed();
    }

    public async changeStorage(system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./change-storage/change-storage.component').then(m => m.ChangeStorageModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    #cloudStorageActionMethodFactory = <T>(modalContent: () => Promise<ComponentType<T>>) => async (licenseManager: LicenseManager, cloudStorageManager?: CloudStorageManager) => {
        const component = await modalContent();
        return this.open(component, { ...cloudStorageActionDialogConfig, data: { licenseManager, cloudStorageManager } }).afterClosed();
    };

    public cloudStorageActivate = this.#cloudStorageActionMethodFactory(
        () => import('./cloud-storage/activate/cloud-storage-activate.component').then(m => m.CloudStorageActivateModalContent)
    );

    public cloudStorageUpdate = this.#cloudStorageActionMethodFactory(
        () => import('./cloud-storage/modify/cloud-storage-modify.component').then(m => m.CloudStorageModifyModalContent)
    );

    public cloudStorageDelete = this.#cloudStorageActionMethodFactory(
        () => import('./cloud-storage/delete/cloud-storage-delete.component').then(m => m.CloudStorageDeleteModalContent)
    );

    public cloudStorageMigrate = this.#cloudStorageActionMethodFactory(
        () => import('./cloud-storage/move/cloud-storage-move.component').then(m => m.CloudStorageMoveModalContent)
    );

    async connectLocalToCloud(
        system: NxSystem,
    ) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./connect-cloud/connect-cloud.component').then(m => m.ConnectCloudModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async addPartnerBrand() {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./add-brand/add-brand.component').then(m => m.AddPartnerBrandModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async addBrandUser() {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./add-customization-user/add-customization-user.component').then(m => m.AddCustomizationUserModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async addBrandPartner() {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./add-partner/add-partner.component').then(m => m.AddPartnerModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async disconnect(system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./disconnect/disconnect.component').then(m => m.DisconnectModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async removeSystem(system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./remove-system/remove-system.component').then(m => m.RemoveSystemModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async restartServer(system: NxSystem, serverId: string, serverName: string) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                serverId,
                serverName,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./restart-server/restart-server.component').then(m => m.RestartServerModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async detachServer(system: NxSystem, serverId: string, serverName: string) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                serverId,
                serverName,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./detach-server/detach-server.component').then(m => m.DetachServerModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async resetServer(system: NxSystem, serverId: string, serverName: string) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                serverId,
                serverName,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./reset-server/reset-server.component').then(m => m.ResetServerModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async changePassword(system: NxSystem, user: NxUser): Promise<boolean> {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                user,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);
        await this.preloadDialogsModule();
        const component = await import('./change-password/change-password.component').then(m => m.ChangePasswordModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async wizard() {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        // No need to preload all dialogs in wizard mode
        // await this.preloadDialogsModule();
        const component = await import('./wizard/wizard.component').then(m => m.WizardModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async merge(system: NxSystem, systems: NxSystemInfo[]) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                systems,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./merge/merge.component').then(m => m.MergeModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    // TODO: Not used - keep as reference
    // public embed (systemId: string) {
    //     const config: Partial<DialogConfig> = {};
    //     const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);
    //
    //     return this.open(EmbedModalContent, dialogConfig)
    //         .afterClosed();
    // }

    public async updateCameraCredentials(
        camera: NxSystemCamera,
        system: NxSystem,
        updateCallback: () => Promise<void>
    ) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                camera,
                updateCallback,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);
        await this.preloadDialogsModule();
        const component = await import('./update-camera-credentials/update-camera-credentials.component').then(m => m.UpdateCameraCredentialsModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async resetBackupToDefaultSettings(
        system: NxSystem,
        setDefaultBackupSettings: () => Promise<any>
    ) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                setDefaultBackupSettings,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./reset-backup/reset-backup.component').then(m => m.ResetBackupModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async toggleSystem2fa(
        system: NxSystem,
        system2faEnabled: boolean,
    ): Promise<string | undefined> {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                system,
                system2faEnabled,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./mandatory-2fa/mandatory-2fa.component').then(m => m.Mandatory2faModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async selectTimeRange(selection: TimelineSelectionService, start: number, end: number) {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                selection,
                start,
                end
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./select-time-range-native-fallback/select-time-range.component').then(m => m.SelectTimeRangeModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    // eslint-disable-next-line camelcase
    public async createSystemGroup(targetId?: string, targetName?: string): Promise<void> {
        const config: Partial<DialogConfig> = {
            data: {
                targetId,
                targetName
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./create-system-group/create-system-group.component').then(m => m.CreateSystemGroupModalContent);

        return this.open(component, dialogConfig).afterClosed();
    }

    public async reserveSpaceWarning(): Promise<string | void> {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./reserve-space-warning/reserve-space-warning.component').then(m => m.ReserveSpaceWarningModalContent);

        return this.open(component, dialogConfig).afterClosed();
    }

    // New Feature Info ModalContent

    /**
     * Factory to create method for the new feature information modal.
     *
     * For hard coded views use the template name, for dynamic view then pass a TemplateRef.
     *
     * @param template: string | TemplateRef<T>
     * @returns: () => Promise<any>
     */
    #newFeatureMethodFactory = <T>(
        template: string | TemplateRef<T>
    ) => async (data?: Record<string, unknown>) => {
        await this.preloadDialogsModule();
        const component = await import('./new-feature/new-feature.component').then(m => m.NewFeatureInformationModalContent);

        return this.open(
            component, {
                ...infoDialogConfig,
                data: { ...data, template }
            }).afterClosed();
    };

    public cloudStorageInfo = this.#newFeatureMethodFactory('cloudStorage');

    public cloudLayoutsInfo = this.#newFeatureMethodFactory('cloudLayouts');

    /* ANGULAR CDK DIALOGS */
    /* General steps for migrating a dialog to angular CDK
    1. Add data and return types to dialogs.types.ts.
    2. Replace dialogRef and DIALOG_DATA in the dialog component with the CDK equivalents.
       DialogRef should have the dialog's return type as the generic, and DIALOG_DATA should
       be the dialog's data type.
    3. Extend dialog class with ModalBase with the dialog's return type as the generic.
       a. Remove the existing .close() method unless overriding with additional behavior
    4. Delete existing closable property if present
       a. IMPORTANT: Because the default behavior is closing the dialog when
          clicking outside of it, make sure to use the .lock() method at the beginning
          of the Process if the dialog has one, and to .unlock() when the Process
          completes without closing or errors.
    5. Replace the dialog method in dialogs.service.ts
       a. If you don't require any special behavior, use the dialogV2Factory
       b. If you do require special behavior, use openV2 directly
    6. Convert the dialog component to SCAM
       a. Remove the component from declarations in dialogs.module.ts and add
          the module to imports
     */

    private openV2<R, D = never, T = unknown>(
        component: ComponentType<T>,
        customconfig: CdkDialogConfig<D> = {}
    ): Promise<R> {
        const dialogConfig: CdkDialogConfig<D> = {
            width: DIALOG_SIZE_V2.NORMAL, // Default width
            ...customconfig
        };
        return firstValueFrom(
            this.cdkDialog.open<R, D>(component, dialogConfig).closed
        );
    }

    /**
     *
     * @param componentPromise Function that lazy imports the modal content
     * @param customConfig CDK config options https://material.angular.io/cdk/dialog/api#DialogConfig
     * @returns A function to open the dialog
     */
    private dialogV2Factory<DT extends Dt.DialogType, CT = unknown>(
        componentPromise: () => Promise<ComponentType<CT>>,
        customConfig: CdkDialogConfig<never> = {},
    ): (data: DT['data']) => Promise<DT['return']> {
        return async data => {
            const component = await componentPromise();
            const configWithData: CdkDialogConfig<DT['data']> = {
                ...customConfig,
                data
            };
            return this.openV2(component, configWithData);
        };
    }

    /* General use */
    generic = this.dialogV2Factory<Dt.Generic>(
        () => import('./generic/generic.component').then(m => m.GenericModalContent)
    );

    async alert(data: Dt.Alert['data']): Promise<Dt.Alert['return']> {
        const component = await import('./generic/generic.component').then(m => m.GenericModalContent);
        const dialogConfig: CdkDialogConfig<Dt.Generic['data']> = {
            data: { ...data, footer: { actionable: false, ...(data.footer ?? {}) } },
            // Only close button
        };
        return this.openV2(component, dialogConfig);
    }

    async confirm(data: Dt.Confirm['data']): Promise<Dt.Confirm['return']> {
        const component = await import('./generic/generic.component').then(m => m.GenericModalContent);
        const dialogConfig: CdkDialogConfig<Dt.Generic['data']> = {
            data: { ...data, footer: { actionable: true, ...data.footer } },
            // With action/cancel buttons
        };
        return this.openV2(component, dialogConfig);
    }

    /* Auth */
    async expiredSession(): Promise<Dt.Confirm['return']> {
        return this.confirm({
            disableClose: true,
            title: this.LANG.dialogs.renewAuth.title,
            message: this.LANG.dialogs.renewAuth.message,
            footer: { actionLabel: this.LANG.dialogs.buttons.ok }
        });
    }

    refreshSession = this.dialogV2Factory<Dt.RefreshSession>(
        () => import('./refresh-session/refresh-session.component').then(m => m.RefreshSessionModalContent),
        { disableClose: true }
    );

    client2faWarning = this.dialogV2Factory<Dt.Client2faWarning>(
        () => import('./client-2fa-warning/client-2fa-warning.component').then(m => m.Client2faWarningModalContent)
    );

    /* Account */
    private async account2fa<A extends TfaAction>(
        data: Dt.Account2faData<A>,
        config: CdkDialogConfig<never> = {},
    ): Promise<Dt.Account2faReturn> {
        const component = await import('./two-fa/two-fa.component').then(m => m.TwoFAModalContent);
        const configWithData: CdkDialogConfig<Dt.Account2faData<A>> = {
            width: DIALOG_SIZE_V2.SMALL,
            ...config,
            data
        };
        return this.openV2(component, configWithData);
    }

    account2faEnable(): Promise<Dt.Account2faReturn> {
        return this.account2fa({ action: TfaAction.Enable });
    }

    account2faDisable(num2FaSystems: number): Promise<Dt.Account2faReturn> {
        return this.account2fa({
            action: TfaAction.Disable,
            data: { num2FaSystems }
        });
    }

    account2faCodeToggle(state: boolean): Promise<Dt.Account2faReturn> {
        const action = state
            ? TfaAction.CodeOnLoginEnable
            : TfaAction.CodeOnLoginDisable;
        return this.account2fa({ action }, { restoreFocus: false });
    }

    account2faNewBackupCodes(): Promise<Dt.Account2faReturn> {
        return this.account2fa({ action: TfaAction.NewBackupCodes });
    }

    account2faPasswordChange(
        oldPassword: string,
        newPassword: string
    ): Promise<Dt.Account2faReturn> {
        return this.account2fa({
            action: TfaAction.PasswordChange,
            data: { oldPassword, newPassword }
        });
    }

    message = this.dialogV2Factory<Dt.Message>(
        () => import('./message/message.component').then(m => m.MessageModalContent),
        { autoFocus: '#message' },
    );

    /* Systems */

    /* Groups */

    /* Admin */
    transferOwnership = this.dialogV2Factory<Dt.TransferOwnership>(
        () => import('./transfer-ownership/transfer-ownership.component').then(m => m.TransferOwnershipModalContent)
    );

    /* Cameras */

    /* Users */
    addUser = this.dialogV2Factory<Dt.AddUser>(
        () => import('./add-user/add-user.component').then(m => m.AddUserModalContent)
    );

    removeUser = this.dialogV2Factory<Dt.RemoveUser>(
        () => import('./remove-user/remove-user.component').then(m => m.RemoveUserModalContent)
    );

    deleteCloudUser = this.dialogV2Factory<Dt.DeleteCloudUser>(
        () => import('./delete-cloud-user/delete-cloud-user.component').then(m => m.DeleteCloudUserModalContent),
        { autoFocus: 'input' }
    );

    /* Servers */

    /* Bookmarks */
    moreDevices = this.dialogV2Factory<Dt.MoreDevices>(
        () => import('./bookmarks/more-devices/more-devices.component').then(m => m.NxMoreDevicesModalContent),
        { width: DIALOG_SIZE_V2.INFO, autoFocus: 'input' },
    );

    moreTags = this.dialogV2Factory<Dt.MoreTags>(
        () => import('./bookmarks/more-tags/more-tags.component').then(m => m.NxMoreTagsModalContent),
        { width: DIALOG_SIZE_V2.INFO, autoFocus: 'input' }
    );
}
