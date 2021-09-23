import { Inject, Injectable, Injector }        from '@angular/core';
import { DOCUMENT, Location }                  from '@angular/common';
import { DomSanitizer }                        from '@angular/platform-browser';
import { NgbModal }                            from '@ng-bootstrap/ng-bootstrap';
import { Router }                              from '@angular/router';
import { NgForm }                              from '@angular/forms';
import { UntilDestroy }                        from '@ngneat/until-destroy';
import { BehaviorSubject, SubscriptionLike }   from 'rxjs';

import { NxToastService }                      from './toast.service';
import { NxLanguageProviderService }           from '@services/nx-language-provider';
import { NxConfigService, IConfig }            from '@services/nx-config';
import { NxSystem, ICamera, NxSystemUser }     from '@services/system.service';
import { Process }                             from '@services/process.service';
import { NxCloudApiService }                   from '@services/nx-cloud-api';
import { LanguageI18NStaticTypes }             from '@app/language_i18n_static_types';

import { LoginModalContent }                   from './login/login.component';
import { GenericModalContent }                 from './generic/generic.component';
import { AddUserModalContent }                 from './add-user/add-user.component';
import { DisconnectModalContent }              from './disconnect/disconnect.component';
import { MessageModalContent }                 from './message/message.component';
import { EmbedModalContent }                   from './embed/embed.component';
import { MergeModalContent }                   from './merge/merge.component';
import { ApplyModalContent }                   from './apply/apply.component';
import { RemoveSystemModalContent }            from './remove-system/remove-system.component';
import { RemoveUserModalContent }              from './remove-user/remove-user.component';
import { RestartServerModalContent }           from './restart-server/restart-server.component';
import { DetachServerModalContent }            from './detach-server/detach-server.component';
import { ResetServerModalContent }             from './reset-server/reset-server.component';
import { DeleteCloudUserModalContent }         from './delete-cloud-user/delete-cloud-user.component';
import { ChangePasswordModalContent }          from './change-password/change-password.component';
import { UpdateCameraCredentialsModalContent } from './update-camera-credentials/update-camera-credentials.component';
import { CloudStorageDeleteModalContent }      from './cloud-storage/delete/cloud-storage-delete.component';
import { CloudStorageMoveModalContent }        from './cloud-storage/move/cloud-storage-move.component';
import { LoginWebadminModalContent }           from './login-webadmin/login-webadmin.component';
import { WizardModalContent }                  from './wizard/wizard.component';
import { ResetBackupModalContent }             from './reset-backup/reset-backup.component';
import { AddStorageModalContent }              from './add-storage/add-storage.component';
import { ChangeStorageModalContent }           from './change-storage/change-storage.component';
import { TwoFAModalContent }                   from './two-fa/two-fa.component';
import { NxAccountService }                    from '@services/account.service';
import { BaseAccount }                         from '@services/account.service/base';
import { CloudAccount }                        from '@services/account.service/cloud';
import { NxBootstrapProvider }                 from '@services/nx-bootstrap-provider';
import { EditModalContent }                    from './edit/edit.component';
import { ModalContent }                        from '@components/console-table/console-table.component';
import { DownloadAsyncModalContent }           from './download-async/download-async.component';
import { StorageManager }                      from '@services/system.service/system/storage-manager/storage-manager';

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

    ngOnDestroy() {}

    dismiss() {
        this.toastService.remove();
    }

    notify(message: string, type: string, hold?: boolean) {
        type = type || this.CONFIG.toast.info;
        hold = hold || false;

        const options = {
            autohide  : !hold,
            classname : type,
            delay     : this.CONFIG.alertTimeout
        };

        return this.toastService.show(message, options);
    }

    createModal<Modal, Options extends IParams, Inputs extends IParams, Result extends any>(
        modal: Modal, options: Options, inputs: Inputs
    ): Promise<Result> {
        const modalRef = this.modalService.open(modal, options);
        Object.assign(modalRef.componentInstance, inputs);
        return modalRef.result;
    }

    alert(message: string, title: string, footerClass?: string) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            message     : this.domSanitizer.bypassSecurityTrustHtml(message),
            title,
            actionLabel : this.LANG.dialogs.buttons.ok?.(),
            buttonType  : 'default',
            cancelLabel : this.LANG.dialogs.buttons.cancel?.(),
            buttonClass : 'btn-primary',
            footerClass : footerClass || '',
            hasFooter   : true,
            cancellable : true,
            closable    : true
        };

        return this.createModal(GenericModalContent, options, params);
    }

    apply(applyFunc: Process, discardFunc: () => void, form: NgForm) {
        // Blur activeElement to prevent ExpressionChangedAfterItHasBeenCheckedError
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        const options: any = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        return this.createModal(ApplyModalContent, options, { applyFunc, discardFunc, form });
    }

    confirm(
        message: string, title: string, actionLabel: string, actionType?: string, cancelLabel?: string, footerClass?: string
    ) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            message     : message ? this.domSanitizer.bypassSecurityTrustHtml(message) : '',
            title,
            actionLabel,
            buttonType  : actionType || 'default',
            cancelLabel,
            buttonClass : actionType || 'btn-primary',
            footerClass : footerClass || '',
            hasFooter   : true,
            cancellable : false,
            closable    : true
        };

        return this.createModal(GenericModalContent, options, params);
    }

    login(account: NxAccountService | BaseAccount | CloudAccount, keepPage?: boolean, redirectClose?: boolean, redirectHome = false, blockNavigation = false) {
        if (this.CONFIG.browserNotSupported) {
            return;
        }

        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static',
            size        : 'sm'
        };

        const params: IParams = {
            account       : account,
            login         : this.login,
            cancellable   : !keepPage || false,
            closable      : true,
            location      : this.location,
            keepPage      : (keepPage !== undefined) ? keepPage : true,
            redirectClose : redirectClose || false,
            redirectHome,
            blockNavigation
        };

        if (this.CONFIG.isLocal) {
            if (this.bootstrapProvider.newSystem) {
                return;
            }
            Object.assign(options, {
                centered      : true,
                keyboard      : false,
                backdropClass : 'webadmin-backdrop',
                windowClass   : 'webadmin-window'
            });
        }

        return this.createModal(NxConfigService.isLocal ? LoginWebadminModalContent : LoginModalContent
            , options, params)
            // handle how the dialog was closed
            // required if we need to have dismissible dialog otherwise
            // will raise a JS error ( Uncaught [in promise] )
            .then((result) => {
                this.closeResult = `Closed with: ${result}`;

                if (redirectClose && result === 'canceled') {
                    return this.router.navigate([this.CONFIG.redirect.unauthorised]);
                }
                return result;
            }, (reason) => {
                this.closeResult = 'Dismissed';
            });
    }

    addUser(system: NxSystem) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system,
            closable: true
        };

        return this.createModal(AddUserModalContent, options, params);
    }

    addStorage(serverId: string, storageManager: StorageManager, cancelPolls: () => any) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            serverId,
            storageManager,
            cancelPolls,
            closable: true
        };

        return this.createModal(AddStorageModalContent, options, params);
    }

    edit(modalContent: ModalContent) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };
        return this.createModal(EditModalContent, options, modalContent);
    }

    downloadAsync(modalContent: ModalContent) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };
        return this.createModal(DownloadAsyncModalContent, options, modalContent);
    }

    changeStorage(system: NxSystem) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system,
            closable: true
        };

        return this.createModal(ChangeStorageModalContent, options, params);
    }

    cloudStorageDelete(system$: BehaviorSubject<NxSystem>, updateCallback: () => void) {
        // WIP still need to implement
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system$,
            closable: true,
            updateCallback
        };

        return this.createModal(CloudStorageDeleteModalContent, options, params);
    }

    cloudStorageMove(system$: BehaviorSubject<NxSystem>, updateCallback: () => void) {
        // WIP still need to implement
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system$,
            closable: true,
            updateCallback
        };

        return this.createModal(CloudStorageMoveModalContent, options, params);
    }

    disconnect(account: NxAccountService, system: NxSystem) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            account,
            system,
            closable: true
        };

        return this.createModal(DisconnectModalContent, options, params);
    }

    removeUser(system: NxSystem, user: NxSystemUser) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system,
            user,
            closable: true
        };

        return this.createModal(RemoveUserModalContent, options, params);
    }

    removeSystem(system: NxSystem) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system,
            closable: true
        };

        return this.createModal(RemoveSystemModalContent, options, params);
    }

    restartServer(system: NxSystem, serverId: string, serverName: string) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system,
            serverId,
            serverName,
            closable: true
        };

        return this.createModal(RestartServerModalContent, options, params);
    }

    detachServer(system: NxSystem, serverId: string, serverName: string) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system,
            serverId,
            serverName,
            closable: true
        };

        return this.createModal(DetachServerModalContent, options, params);
    }

    resetServer(system: NxSystem, serverId: string, serverName: string) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system,
            serverId,
            serverName,
            closable: true
        };

        return this.createModal(ResetServerModalContent, options, params);
    }

    changePassword(system: NxSystem, user: NxSystemUser) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system,
            user,
            closable: true
        };

        return this.createModal(ChangePasswordModalContent, options, params);
    }

    wizard() {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static',
            size        : 'md'
        };

        const params: IParams = {
            closable: false
        };

        return this.createModal(WizardModalContent, options, params);
    }

    merge(account: NxAccountService, system: NxSystem, systems: NxSystem[]) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            user     : account,
            system,
            systems,
            closable : true
        };

        return this.createModal(MergeModalContent, options, params);
    }

    message(account: NxAccountService, type: string, data: IParams): Promise<any> {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            account     : account,
            messageType : type,
            data,
            closable    : true
        };

        return this.createModal(MessageModalContent, options, params);
    }

    embed(systemId: string) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            closable: true
        };

        return this.createModal(EmbedModalContent, options, params);
    }

    deleteCloudUser(cloudApi: NxCloudApiService) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            cloudApi,
            closable: true
        };

        return this.createModal(DeleteCloudUserModalContent, options, params);
    }

    updateCameraCredentials(camera: ICamera, system: NxSystem, updateCallback: () => Promise<any>) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system,
            camera,
            updateCallback,
            closable: true
        };

        return this.createModal(UpdateCameraCredentialsModalContent, options, params);
    }

    resetBackupToDefaultSettings(system: NxSystem, setDefaultBackupSettings: () => {}) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            system,
            setDefaultBackupSettings,
            closable: true
        };

        return this.createModal(ResetBackupModalContent, options, params);
    }

    newCode2FA() {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static',
            size        : 'sm'
        };

        const params: IParams = {
            type     : 'code',
            closable : true
        };

        return this.createModal(TwoFAModalContent, options, params);
    }

    off2FA() {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static',
            size        : 'sm'
        };

        const params: IParams = {
            type     : 'off',
            closable : true
        };

        return this.createModal(TwoFAModalContent, options, params);
    }

    wizard2FA() {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static',
            size        : 'sm'
        };

        const params: IParams = {
            type     : 'wizard',
            closable : true
        };

        return this.createModal(TwoFAModalContent, options, params);
    }
}
