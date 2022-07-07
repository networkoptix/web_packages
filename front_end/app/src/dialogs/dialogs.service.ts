import { ComponentType, Overlay } from '@angular/cdk/overlay';
import { Location } from '@angular/common';
import { Injectable, Injector, TemplateRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { ModalContent } from '@components/console-table/console-table.component.types';
// import { WidgetCard } from '@components/widgets/helper-classes';
import { DashboardConfiguration } from '@pages/dashboard/dashboard-configuration';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { SystemTransferInfo } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import type { ICamera } from '@services/system.service/camera-manager/camera-manager-types';
import { StorageManager } from '@services/system.service/storage-manager/storage-manager';
import type { NxSystem } from '@services/system.service/system';
import type { NxSystemUser } from '@services/system.service/user-manager/user-manager-types';

import { AddStorageModalContent } from './add-storage/add-storage.component';
import { AddUserModalContent } from './add-user/add-user.component';
import { AddWidgetModalContent } from './add-widget/add-widget.component';
import { ChangePasswordModalContent } from './change-password/change-password.component';
import { ChangeStorageModalContent } from './change-storage/change-storage.component';
import { Client2faWarningModalContent } from './client-2fa-warning/client-2fa-warning.component';
import { CloudStorageActivateModalContent } from './cloud-storage/activate/cloud-storage-activate.component';
import { CloudStorageDeleteModalContent } from './cloud-storage/delete/cloud-storage-delete.component';
import { CloudStorageModifyModalContent } from './cloud-storage/modify/cloud-storage-modify.component';
import { CloudStorageMoveModalContent } from './cloud-storage/move/cloud-storage-move.component';
import { ConnectCloudModalContent } from './connect-cloud/connect-cloud.component';
import { CreateSystemGroupModalContent } from './create-system-group/create-system-group.component';
import { DeleteCloudUserModalContent } from './delete-cloud-user/delete-cloud-user.component';
import { DetachServerModalContent } from './detach-server/detach-server.component';
import { DialogBase } from './dialog-base';
import { DialogConfig } from './dialog-config';
import { DIALOG_SIZE, defaultConfig, infoDialogConfig, cloudStorageActionDialogConfig } from './dialog-ref';
import { DisconnectModalContent } from './disconnect/disconnect.component';
import { EditModalContent } from './edit/edit.component';
import { GenericModalContent } from './generic/generic.component';
import { Mandatory2faModalContent } from './mandatory-2fa/mandatory-2fa.component';
import { MergeModalContent } from './merge/merge.component';
import { MessageModalContent } from './message/message.component';
import { NewFeatureInformationModalContent } from './new-feature/new-feature.component';
import { RemoveSystemModalContent } from './remove-system/remove-system.component';
import { RemoveUserModalContent } from './remove-user/remove-user.component';
import { ReserveSpaceWarningModalContent } from './reserve-space-warning/reserve-space-warning.component';
import { ResetBackupModalContent } from './reset-backup/reset-backup.component';
import { ResetServerModalContent } from './reset-server/reset-server.component';
import { RestartServerModalContent } from './restart-server/restart-server.component';
import { SelectTimeRangeModalContent } from './select-time-range-native-fallback/select-time-range.component';
import { NxToastService } from './toast.service';
import {
    TransferOwnershipModalContent
} from './transfer-ownership/transfer-ownership.component';
import { TwoFAModalContent } from './two-fa/two-fa.component';
import {
    UpdateCameraCredentialsModalContent
} from './update-camera-credentials/update-camera-credentials.component';
import { WizardModalContent } from './wizard/wizard.component';

import '@dialogs/dialogs.scss';

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

    public notify(message: string, type: string, hold?: boolean) {
        type = type || this.CONFIG.toast.info;
        hold = hold || false;

        const options = {
            autohide: !hold,
            classname: type,
            delay: this.CONFIG.alertTimeout
        };

        return this.toastService.show(message, options);
    }

    public alert(message: string, title: string, footerClass?: string) {
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

        return this.open(GenericModalContent, dialogConfig)
            .afterClosed();
    }

    public confirm(
        message: string,
        title: string,
        actionLabel: string,
        actionType?: string,
        cancelLabel?: string,
        footerClass?: string
    ): any {
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

        return this.open(GenericModalContent, dialogConfig)
            .afterClosed();
    }

    public addWidget(gridSize, gridGap, widgets, dashboardMenu: DashboardConfiguration[], activeDashboard, updateSelectedDashboard: (id: string) => void) {
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

        return this.open(AddWidgetModalContent, dialogConfig)
            .afterClosed();
    }

    public addStorage(
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

        return this.open(AddStorageModalContent, dialogConfig)
            .afterClosed();
    }

    public edit(modalContent: ModalContent) {
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

        return this.open(EditModalContent, dialogConfig)
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

    public changeStorage(system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(ChangeStorageModalContent, dialogConfig)
            .afterClosed();
    }

    #cloudStorageActionMethodFactory = <T>(modalContent: ComponentType<T>) => () => this.open(modalContent, cloudStorageActionDialogConfig).afterClosed();

    public cloudStorageActivate = this.#cloudStorageActionMethodFactory(CloudStorageActivateModalContent);

    public cloudStorageUpdate = this.#cloudStorageActionMethodFactory(CloudStorageModifyModalContent);

    public cloudStorageDelete = this.#cloudStorageActionMethodFactory(CloudStorageDeleteModalContent);

    public cloudStorageMigrate = this.#cloudStorageActionMethodFactory(CloudStorageMoveModalContent);

    connectLocalToCloud(
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

        return this.open(ConnectCloudModalContent, dialogConfig)
            .afterClosed();
    }

    public addUser(system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(AddUserModalContent, dialogConfig)
            .afterClosed();
    }

    public disconnect(account: NxAccountService, system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                account,
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(DisconnectModalContent, dialogConfig)
            .afterClosed();
    }

    public removeUser(system: NxSystem, user: NxSystemUser) {
        const config: Partial<DialogConfig> = {
            data: {
                user,
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(RemoveUserModalContent, dialogConfig)
            .afterClosed();
    }

    public removeSystem(system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(RemoveSystemModalContent, dialogConfig)
            .afterClosed();
    }

    public restartServer(system: NxSystem, serverId: string, serverName: string) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                serverId,
                serverName,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(RestartServerModalContent, dialogConfig)
            .afterClosed();
    }

    public detachServer(system: NxSystem, serverId: string, serverName: string) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                serverId,
                serverName,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(DetachServerModalContent, dialogConfig)
            .afterClosed();
    }

    public resetServer(system: NxSystem, serverId: string, serverName: string) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                serverId,
                serverName,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(ResetServerModalContent, dialogConfig)
            .afterClosed();
    }

    public changePassword(system: NxSystem, user: NxSystemUser) {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                user,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(ChangePasswordModalContent, dialogConfig)
            .afterClosed();
    }

    public wizard() {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(WizardModalContent, dialogConfig)
            .afterClosed();
    }

    public merge(account: NxAccountService, system: NxSystem, systems: NxSystem[]) {
        const config: Partial<DialogConfig> = {
            data: {
                user: account,
                system,
                systems,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(MergeModalContent, dialogConfig)
            .afterClosed();
    }

    public message(account: NxAccountService, type: string, data: IParams): Promise<any> {
        const config: Partial<DialogConfig> = {
            data: {
                account,
                messageType: type,
                data,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(MessageModalContent, dialogConfig)
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

    public deleteCloudUser(cloudApi: NxCloudApiService) {
        const config: Partial<DialogConfig> = {
            data: {
                cloudApi,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(DeleteCloudUserModalContent, dialogConfig)
            .afterClosed();
    }

    public updateCameraCredentials(
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

        return this.open(UpdateCameraCredentialsModalContent, dialogConfig)
            .afterClosed();
    }

    public resetBackupToDefaultSettings(
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

        return this.open(ResetBackupModalContent, dialogConfig)
            .afterClosed();
    }

    public newCode2FA() {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                type: 'code',
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(TwoFAModalContent, dialogConfig)
            .afterClosed();
    }

    public off2FA(num2FaSystems: number) {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                type: '2fa-off',
                num2FaSystems,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(TwoFAModalContent, dialogConfig)
            .afterClosed();
    }

    passwordVerificationCode(newPassword: string, oldPassword: string) {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                type: 'changePassword',
                newPassword,
                oldPassword,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(TwoFAModalContent, dialogConfig)
            .afterClosed();
    }

    public wizard2FA() {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                type: 'wizard',
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(TwoFAModalContent, dialogConfig)
            .afterClosed();
    }

    toggleVerificationCode(enable: boolean) {
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                type: `verification-${enable ? 'enable' : 'disable'}`,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(TwoFAModalContent, dialogConfig)
            .afterClosed();
    }

    public toggleSystem2fa(
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

        return this.open(Mandatory2faModalContent, dialogConfig)
            .afterClosed();
    }

    public selectTimeRange() {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(SelectTimeRangeModalContent, dialogConfig)
            .afterClosed();
    }

    public transferOwnership(
        system: NxSystem,
        transfers: SystemTransferInfo[],
    ): Promise<void> {
        const config: Partial<DialogConfig> = {
            data: {
                system,
                transfers,
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);
        return this.open(TransferOwnershipModalContent, dialogConfig)
            .afterClosed();
    }

    public createSystemGroup(): Promise<void> {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);
        return this.open(CreateSystemGroupModalContent, dialogConfig).afterClosed();
    }

    public client2faWarning(): Promise<void> {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);
        return this.open(Client2faWarningModalContent, dialogConfig).afterClosed();
    }

    public reserveSpaceWarning(): Promise<string | void> {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);
        return this.open(ReserveSpaceWarningModalContent, dialogConfig).afterClosed();
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
    ) => () => this.open(
        NewFeatureInformationModalContent, {
            ...infoDialogConfig,
            data: { template }
        }).afterClosed();

    public cloudStorageInfo = this.#newFeatureMethodFactory('cloudStorage');
}
