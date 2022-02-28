import { Overlay, ComponentType } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DOCUMENT, Location } from '@angular/common';
import { Inject, Injectable, Injector } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { UntilDestroy } from '@ngneat/until-destroy';
import { BehaviorSubject, SubscriptionLike } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { ModalContent } from '@components/console-table/console-table.component.types';
// import { WidgetCard } from '@components/widgets/helper-classes';
import { DashboardConfiguration } from '@pages/dashboard/dashboard.component';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
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
import { CloudStorageDeleteModalContent } from './cloud-storage/delete/cloud-storage-delete.component';
import { CloudStorageMoveModalContent } from './cloud-storage/move/cloud-storage-move.component';
import { ConnectCloudModalContent } from './connect-cloud/connect-cloud.component';
import { CreateSystemGroupModalContent } from './create-system-group/create-system-group.component';
import { DeleteCloudUserModalContent } from './delete-cloud-user/delete-cloud-user.component';
import { DetachServerModalContent } from './detach-server/detach-server.component';
import { DialogConfig } from './dialog-config';
import {
    DIALOG_DATA,
    DIALOG_SIZE,
    defaultConfig,
    DialogRef
} from './dialog-ref';
import { DisconnectModalContent } from './disconnect/disconnect.component';
// import { DownloadAsyncModalContent } from './download-async/download-async.component';
import { EditModalContent } from './edit/edit.component';
import { GenericModalContent } from './generic/generic.component';
import { Mandatory2faModalContent } from './mandatory-2fa/mandatory-2fa.component';
import { MergeModalContent } from './merge/merge.component';
import { MessageModalContent } from './message/message.component';
import { MoveSystemToGroupModalContent } from './move-system-to-group/move-system-to-group.component';
import { RemoveSystemModalContent } from './remove-system/remove-system.component';
import { RemoveUserModalContent } from './remove-user/remove-user.component';
import { ResetBackupModalContent } from './reset-backup/reset-backup.component';
import { ResetServerModalContent } from './reset-server/reset-server.component';
import { RestartServerModalContent } from './restart-server/restart-server.component';
import { SelectTimeRangeModalContent } from './select-time-range-native-fallback/select-time-range.component';
import { SystemGroupSettingsModalContent }  from './system-group-settings/system-group-settings.component';
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
export class NxDialogsService {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    location: Location;
    closeResult: string;

    languageSubscription: SubscriptionLike;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        location: Location,
        @Inject(DOCUMENT) private document: Document,
        private toastService: NxToastService,
        private domSanitizer: DomSanitizer,
        private overlay: Overlay,
        private injector: Injector,
    ) {
        this.CONFIG = configService.getConfig();
        this.location = location;

        this.languageSubscription = languageService.translateSubject
            .subscribe(() => {
                this.LANG = languageService.translations;
            });
    }

    public ngOnDestroy() {
    }

    public dismiss() {
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
    public downloadAsync(modalContent: ModalContent) {
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

    public cloudStorageDelete(
        system$: BehaviorSubject<NxSystem>,
        updateCallback: () => void
    ) {
        // WIP still need to implement
        const config: Partial<DialogConfig> = {
            data: {
                system$,
                updateCallback
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(CloudStorageDeleteModalContent, dialogConfig)
            .afterClosed();
    }

    public cloudStorageMove(
        system$: BehaviorSubject<NxSystem>,
        updateCallback: () => void
    ) {
        // WIP still need to implement
        const config: Partial<DialogConfig> = {
            data: {
                system$,
                updateCallback
            }
        };
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(CloudStorageMoveModalContent, dialogConfig)
            .afterClosed();
    }

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

    open<T>(component: ComponentType<T>, config: DialogConfig = defaultConfig): DialogRef {
        const positionStrategy = this.overlay
            .position()
            .global()
            .centerHorizontally()
            .centerVertically();

        const overlayRef = this.overlay.create({
            positionStrategy,
            hasBackdrop: config.hasBackdrop,
            backdropClass: config.backdropClass,
            panelClass: config.panelClass,
            width: config.width,
        });

        // Create dialogRef to return
        const dialogRef = new DialogRef(overlayRef);
        const injector = Injector.create({
            parent: this.injector,
            providers: [
                { provide: DialogRef, useValue: dialogRef },
                { provide: DIALOG_DATA, useValue: config.data },
            ]
        });

        const portal = new ComponentPortal(component, null, injector);
        overlayRef.attach(portal);

        return dialogRef;
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

    public  merge(account: NxAccountService, system: NxSystem, systems: NxSystem[]) {
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
                account: account,
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

    public transferOwnership(system: NxSystem) {
        const config: Partial<DialogConfig> = {
            data: {
                system
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

    public systemGroupSettings() {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);
        return this.open(SystemGroupSettingsModalContent, dialogConfig).afterClosed();
    }

    public moveSystemToGroup(): Promise<void> {
        const config: Partial<DialogConfig> = {};
        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);
        return this.open(MoveSystemToGroupModalContent, dialogConfig).afterClosed();
    }
}
