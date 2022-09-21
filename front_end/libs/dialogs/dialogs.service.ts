import { ComponentType, Overlay } from '@angular/cdk/overlay';
import { Location } from '@angular/common';
import { Injectable, Injector, TemplateRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { ModalContent } from '@components/console-table/console-table.component.types';
import { DashboardConfiguration } from '@pages/dashboard/dashboard-configuration';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import type { ICamera } from '@services/system.service/camera-manager/camera-manager-types';
import { CloudStorageManager } from '@services/system.service/cloud-storage-manager/cloud-storage-manager';
import { LicenseManager } from '@services/system.service/license-manager/licence-manager';
import { StorageManager } from '@services/system.service/storage-manager/storage-manager';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemUser } from '@services/system.service/user-manager/user-manager-types';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';

import { DialogBase } from './dialog-base';
import { DialogConfig } from './dialog-config';
import { DIALOG_SIZE, defaultConfig, infoDialogConfig, cloudStorageActionDialogConfig } from './dialog-ref';
import { NxToastService } from './toast.service';

// import '@dialogs/dialogs.scss';

interface IParams<Value = any> {
    [key: string]: Value;
}

@UntilDestroy({ checkProperties: true })
@Injectable({ providedIn: 'root' })
export class NxDialogsService extends DialogBase {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    location: Location;
    closeResult: string;

    languageSubscription: SubscriptionLike;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        location: Location,
        injector: Injector,
        overlay: Overlay,
        private toastService: NxToastService,
        private domSanitizer: DomSanitizer,
    ) {
        super(overlay, injector);
        this.CONFIG = configService.getConfig();
        this.location = location;

        this.languageSubscription = languageService.translateSubject
            .subscribe(() => {
                this.LANG = languageService.translations;
            });
    }

    public ngOnDestroy(): void {
    }

    public dismiss(): void {
        this.toastService.remove();
    }

    public notify(
        message: string,
        type: string = this.CONFIG.toast.info,
        hold?: boolean
    ): void {
        this.toastService.show(message, type, { autohide: !hold });
    }

    public async alert(message: string, title: string, footerClass?: string) {
        const config: Partial<DialogConfig> = {
            data: {
                message: this.domSanitizer.bypassSecurityTrustHtml(message),
                title,
                actionLabel: this.LANG.dialogs.buttons.ok?.(),
                buttonType: 'default',
                cancelLabel: this.LANG.dialogs.buttons.cancel?.(),
                buttonClass: 'btn-primary',
                footerClass: footerClass || '',
                hasFooter: true,
                cancellable: true,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./generic/generic.component').then(m => m.GenericModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async confirm(
        message: string,
        title: string,
        actionLabel: string,
        actionType?: string,
        cancelLabel?: string,
        footerClass?: string
    ) {
        const config: Partial<DialogConfig> = {
            data: {
                message: message ? this.domSanitizer.bypassSecurityTrustHtml(message) : '',
                title,
                actionLabel,
                buttonType: actionType || 'default',
                cancelLabel,
                buttonClass: actionType || 'btn-primary',
                footerClass: footerClass || '',
                hasFooter: true,
                cancellable: false,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./generic/generic.component').then(m => m.GenericModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
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

    public async edit(modalContent: ModalContent) {
        const config: Partial<DialogConfig> = {
            data: {
                heading: modalContent.heading,
                modal: modalContent.modal,
                values: modalContent.values,
                manifest: modalContent.manifest,
                settings: modalContent.settings,
                contextList: modalContent.contextList,
            }
        };
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
        account: NxAccountService,
        system: NxSystem,
    ) {
        const config: Partial<DialogConfig> = {
            data: {
                account,
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./connect-cloud/connect-cloud.component').then(m => m.ConnectCloudModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async addUser(system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./add-user/add-user.component').then(m => m.AddUserModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async disconnect(account: NxAccountService, system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                account,
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./disconnect/disconnect.component').then(m => m.DisconnectModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async removeUser(system: NxSystem, user: NxSystemUser) {
        const config: Partial<DialogConfig> = {
            data: {
                user,
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./remove-user/remove-user.component').then(m => m.RemoveUserModalContent);

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

    public async changePassword(system: NxSystem, user: NxSystemUser) {
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

        await this.preloadDialogsModule();
        const component = await import('./wizard/wizard.component').then(m => m.WizardModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async merge(account: NxAccountService, system: NxSystem, systems: NxSystem[]) {
        const config: Partial<DialogConfig> = {
            data: {
                user: account,
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

    public async message(account: NxAccountService, type: string, data: IParams): Promise<any> {
        const config: Partial<DialogConfig> = {
            data: {
                account,
                messageType: type,
                data,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./message/message.component').then(m => m.MessageModalContent);

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

    public async deleteCloudUser(cloudApi: NxCloudApiService) {
        const config: Partial<DialogConfig> = {
            data: {
                cloudApi,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./delete-cloud-user/delete-cloud-user.component').then(m => m.DeleteCloudUserModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async updateCameraCredentials(
        camera: ICamera,
        system: NxSystem,
        updateCallback: () => Promise<any>
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

    public async newCode2FA() {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                type: 'code',
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./two-fa/two-fa.component').then(m => m.TwoFAModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async off2FA(num2FaSystems: number) {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                type: '2fa-off',
                num2FaSystems,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./two-fa/two-fa.component').then(m => m.TwoFAModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    async passwordVerificationCode(newPassword: string, oldPassword: string) {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                type: 'changePassword',
                newPassword,
                oldPassword,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./two-fa/two-fa.component').then(m => m.TwoFAModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async wizard2FA() {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                type: 'wizard',
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./two-fa/two-fa.component').then(m => m.TwoFAModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    async toggleVerificationCode(enable: boolean) {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                type: `verification-${enable ? 'enable' : 'disable'}`,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./two-fa/two-fa.component').then(m => m.TwoFAModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async toggleSystem2fa(
        system: NxSystem,
        system2faEnabled: boolean,
    ): Promise<any> {
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

    public async selectTimeRange(selection: TimelineSelectionService) {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                selection
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./select-time-range-native-fallback/select-time-range.component').then(m => m.SelectTimeRangeModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    public async transferOwnership(system: NxSystem): Promise<void | SystemTransferInfo> {
        const config: Partial<DialogConfig> = {
            data: {
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./transfer-ownership/transfer-ownership.component').then(m => m.TransferOwnershipModalContent);

        return this.open(component, dialogConfig)
            .afterClosed();
    }

    // eslint-disable-next-line camelcase
    public async createSystemGroup(target_id?: string): Promise<void> {
        const config: Partial<DialogConfig> = {
            data: {
                target_id
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./create-system-group/create-system-group.component').then(m => m.CreateSystemGroupModalContent);

        return this.open(component, dialogConfig).afterClosed();
    }

    public async client2faWarning(): Promise<void> {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        await this.preloadDialogsModule();
        const component = await import('./client-2fa-warning/client-2fa-warning.component').then(m => m.Client2faWarningModalContent);

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
    ) => async (data: Record<string, unknown>) => {
        await this.preloadDialogsModule();
        const component = await import('./new-feature/new-feature.component').then(m => m.NewFeatureInformationModalContent);

        return this.open(
            component, {
            ...infoDialogConfig,
            data: { ...data, template }
        }).afterClosed();
    };

    public cloudStorageInfo = this.#newFeatureMethodFactory('cloudStorage');
}
