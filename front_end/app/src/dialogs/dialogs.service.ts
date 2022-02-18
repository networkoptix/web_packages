import { DOCUMENT, Location } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { NgForm } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy } from '@ngneat/until-destroy';
import { BehaviorSubject, SubscriptionLike } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { ModalContent } from '@components/console-table/console-table.component.types';
import { WidgetCard } from '@components/widgets/helper-classes';
import { ConnectCloudModalContent } from '@dialogs/connect-cloud/connect-cloud.component';
import { DashboardConfiguration } from '@pages/dashboard/dashboard.component';
import { NxAccountService } from '@services/account.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process } from '@services/process.service';
import { NxSystem, ICamera, NxSystemUser } from '@services/system.service';
import { StorageManager } from '@services/system.service/system/storage-manager/storage-manager';

import { AddStorageModalContent } from './add-storage/add-storage.component';
import { AddUserModalContent } from './add-user/add-user.component';
import { AddWidgetModalContent } from './add-widget/add-widget.component';
import { ApplyModalContent } from './apply/apply.component';
import { ChangePasswordModalContent } from './change-password/change-password.component';
import { ChangeStorageModalContent } from './change-storage/change-storage.component';
import { CloudStorageDeleteModalContent } from './cloud-storage/delete/cloud-storage-delete.component';
import { CloudStorageMoveModalContent } from './cloud-storage/move/cloud-storage-move.component';
import { DeleteCloudUserModalContent } from './delete-cloud-user/delete-cloud-user.component';
import { DetachServerModalContent } from './detach-server/detach-server.component';
import { DisconnectModalContent } from './disconnect/disconnect.component';
import { DownloadAsyncModalContent } from './download-async/download-async.component';
import { EditModalContent } from './edit/edit.component';
import { EmbedModalContent } from './embed/embed.component';
import { GenericModalContent } from './generic/generic.component';
import { Mandatory2faModalContent } from './mandatory-2fa/mandatory-2fa.component';
import { MergeModalContent } from './merge/merge.component';
import { MessageModalContent } from './message/message.component';
import { RemoveSystemModalContent } from './remove-system/remove-system.component';
import { RemoveUserModalContent } from './remove-user/remove-user.component';
import { ResetBackupModalContent } from './reset-backup/reset-backup.component';
import { ResetServerModalContent } from './reset-server/reset-server.component';
import { RestartServerModalContent } from './restart-server/restart-server.component';
import { SelectTimeRangeModalContent } from './select-time-range/select-time-range.component';
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
        private modalService: NgbModal,
        private toastService: NxToastService,
        private domSanitizer: DomSanitizer,
        private router: Router,
        private bootstrapProvider: NxBootstrapProvider
    ) {
        this.CONFIG = configService.getConfig();
        this.location = location;

        this.languageSubscription = languageService.translateSubject
            .subscribe(() => {
                this.LANG = languageService.translations;
            });
    }

    public ngOnDestroy () {
    }

    public dismiss () {
        this.toastService.remove();
    }

    public notify (message: string, type: string, hold?: boolean) {
        type = type || this.CONFIG.toast.info;
        hold = hold || false;

        const options = {
            autohide: !hold,
            classname: type,
            delay: this.CONFIG.alertTimeout
        };

        return this.toastService.show(message, options);
    }

    public createModal<Modal, Options extends IParams, Inputs extends IParams, Result extends any> (
        modal: Modal, options: Options, inputs: Inputs
    ): Promise<Result> {
        const modalRef = this.modalService.open(modal, options);
        Object.assign(modalRef.componentInstance, inputs);
        return modalRef.result;
    }

    public alert (message: string, title: string, footerClass?: string) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            message: this.domSanitizer.bypassSecurityTrustHtml(message),
            title,
            actionLabel: this.LANG.dialogs.buttons.ok?.(),
            buttonType: 'default',
            cancelLabel: this.LANG.dialogs.buttons.cancel?.(),
            buttonClass: 'btn-primary',
            footerClass: footerClass || '',
            hasFooter: true,
            cancellable: true,
            closable: true
        };

        return this.createModal(GenericModalContent, options, params);
    }

    public apply (applyFunc: Process, discardFunc: () => void, form: NgForm) {
        // Blur activeElement to prevent ExpressionChangedAfterItHasBeenCheckedError
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        const options: any = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        return this.createModal(ApplyModalContent, options, { applyFunc, discardFunc, form });
    }

    public confirm (
        message: string,
        title: string,
        actionLabel: string,
        actionType?: string,
        cancelLabel?: string,
        footerClass?: string
    ): any {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            message: message ? this.domSanitizer.bypassSecurityTrustHtml(message) : '',
            title,
            actionLabel,
            buttonType: actionType || 'default',
            cancelLabel,
            buttonClass: actionType || 'btn-primary',
            footerClass: footerClass || '',
            hasFooter: true,
            cancellable: false,
            closable: true
        };

        return this.createModal(GenericModalContent, options, params);
    }

    public addUser (system: NxSystem) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system,
            closable: true
        };

        return this.createModal(AddUserModalContent, options, params);
    }

    public addWidget (gridSize, gridGap, widgets, dashboardMenu: DashboardConfiguration[], activeDashboard, updateSelectedDashboard: (id: string) => void) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static',
            size: 'lg'
        };

        const params: IParams = {
            widgets,
            gridSize,
            gridGap,
            closable: true,
            dashboardMenu,
            activeDashboard,
            updateSelectedDashboard,
        };

        return this.createModal(AddWidgetModalContent, options, params) as Promise<WidgetCard>;
    }

    public addStorage (
        serverId: string,
        storageManager: StorageManager,
        cancelPolls: () => any
    ) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            serverId,
            storageManager,
            cancelPolls,
            closable: true
        };

        return this.createModal(AddStorageModalContent, options, params);
    }

    public edit (modalContent: ModalContent) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };
        return this.createModal(EditModalContent, options, modalContent);
    }

    public downloadAsync (modalContent: ModalContent) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };
        return this.createModal(DownloadAsyncModalContent, options, modalContent);
    }

    public changeStorage (system: NxSystem) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system,
            closable: true
        };

        return this.createModal(ChangeStorageModalContent, options, params);
    }

    public cloudStorageDelete (system$: BehaviorSubject<NxSystem>, updateCallback: () => void) {
        // WIP still need to implement
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system$,
            closable: true,
            updateCallback
        };

        return this.createModal(CloudStorageDeleteModalContent, options, params);
    }

    public cloudStorageMove (system$: BehaviorSubject<NxSystem>, updateCallback: () => void) {
        // WIP still need to implement
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system$,
            closable: true,
            updateCallback
        };

        return this.createModal(CloudStorageMoveModalContent, options, params);
    }

    connectLocalToCloud(account: NxAccountService, system: NxSystem) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            account,
            system,
            closable: true
        };

        return this.createModal(ConnectCloudModalContent, options, params);
    }

    public disconnect (account: NxAccountService, system: NxSystem) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            account,
            system,
            closable: true
        };

        return this.createModal(DisconnectModalContent, options, params);
    }

    public removeUser (system: NxSystem, user: NxSystemUser) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system,
            user,
            closable: true
        };

        return this.createModal(RemoveUserModalContent, options, params);
    }

    public removeSystem (system: NxSystem) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system,
            closable: true
        };

        return this.createModal(RemoveSystemModalContent, options, params);
    }

    public restartServer (system: NxSystem, serverId: string, serverName: string) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system,
            serverId,
            serverName,
            closable: true
        };

        return this.createModal(RestartServerModalContent, options, params);
    }

    public detachServer (system: NxSystem, serverId: string, serverName: string) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system,
            serverId,
            serverName,
            closable: true
        };

        return this.createModal(DetachServerModalContent, options, params);
    }

    public resetServer (system: NxSystem, serverId: string, serverName: string) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system,
            serverId,
            serverName,
            closable: true
        };

        return this.createModal(ResetServerModalContent, options, params);
    }

    public changePassword (system: NxSystem, user: NxSystemUser) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system,
            user,
            closable: true
        };

        return this.createModal(ChangePasswordModalContent, options, params);
    }

    public wizard () {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static',
            size: 'md'
        };

        const params: IParams = {
            closable: false
        };

        return this.createModal(WizardModalContent, options, params);
    }

    public  merge (account: NxAccountService, system: NxSystem, systems: NxSystem[]) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            user: account,
            system,
            systems,
            closable: true
        };

        return this.createModal(MergeModalContent, options, params);
    }

    public message (account: NxAccountService, type: string, data: IParams): Promise<any> {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            account: account,
            messageType: type,
            data,
            closable: true
        };

        return this.createModal(MessageModalContent, options, params);
    }

    public embed (systemId: string) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            closable: true
        };

        return this.createModal(EmbedModalContent, options, params);
    }

    public deleteCloudUser (cloudApi: NxCloudApiService) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            cloudApi,
            closable: true
        };

        return this.createModal(DeleteCloudUserModalContent, options, params);
    }

    public updateCameraCredentials (
        camera: ICamera,
        system: NxSystem,
        updateCallback: () => Promise<any>
    ) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system,
            camera,
            updateCallback,
            closable: true
        };

        return this.createModal(UpdateCameraCredentialsModalContent, options, params);
    }

    public resetBackupToDefaultSettings (
        system: NxSystem,
        setDefaultBackupSettings: () => {}
    ) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system,
            setDefaultBackupSettings,
            closable: true
        };

        return this.createModal(ResetBackupModalContent, options, params);
    }

    public newCode2FA () {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static',
            size: 'sm'
        };

        const params: IParams = {
            type: 'code',
            closable: true
        };

        return this.createModal(TwoFAModalContent, options, params);
    }

    public off2FA (num2FaSystems: number) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static',
            size: 'sm'
        };

        const params: IParams = {
            num2FaSystems,
            type: '2fa-off',
            closable: true
        };

        return this.createModal(TwoFAModalContent, options, params);
    }

    passwordVerificationCode(newPassword: string, oldPassword: string) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static',
            size: 'sm'
        };

        const params: IParams = {
            newPassword,
            oldPassword,
            type: 'changePassword',
            closable: true
        };

        return this.createModal(TwoFAModalContent, options, params);
    }

    public wizard2FA() {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static',
            size: 'sm'
        };

        const params: IParams = {
            type: 'wizard',
            closable: true
        };

        return this.createModal(TwoFAModalContent, options, params);
    }

    toggleVerificationCode(enable: boolean) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static',
            size: 'sm'
        };

        const params: IParams = {
            type: `verification-${enable ? 'enable' : 'disable'}`,
            closable: true
        };

        return this.createModal(TwoFAModalContent, options, params);
    }

    public toggleSystem2fa(system: NxSystem, system2faEnabled: boolean): Promise<any> {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system2faEnabled,
            system,
            closable: true
        };

        return this.createModal(Mandatory2faModalContent, options, params);
    }

    public selectTimeRange () {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            closable: true
        };

        return this.createModal(SelectTimeRangeModalContent, options, params);
    }

    public transferOwnership(system: NxSystem) {
        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static'
        };

        const params: IParams = {
            system,
            closable: true
        };

        return this.createModal(TransferOwnershipModalContent, options, params);
    }
}
