import { Inject, Injectable, Injector }                  from '@angular/core';
import { DOCUMENT, Location }                  from '@angular/common';
import { DomSanitizer }                        from '@angular/platform-browser';
import { NgbModal }                            from '@ng-bootstrap/ng-bootstrap';
import { Router }                              from '@angular/router';
import {
    BehaviorSubject, SubscriptionLike
}                                              from 'rxjs';
import { NgForm }                              from '@angular/forms';
import { AutoUnsubscribe }                     from 'ngx-auto-unsubscribe';
import { NxToastService }                      from './toast.service';
import { NxLanguageProviderService }           from '../services/nx-language-provider';
import { NxConfigService, IConfig }            from '../services/nx-config';
import { NxAccountService }                from '../services/account.service';
import { NxSystem, ICamera, NxSystemUser } from '../services/system.service';
import { LanguageI18NStaticTypes }         from '../../language_i18n_static_types';
import { LoginModalContent }                   from './login/login.component';
import { GenericModalContent }                 from './generic/generic.component';
import { AddUserModalContent }                 from './add-user/add-user.component';
import { DisconnectModalContent }              from './disconnect/disconnect.component';
import { RenameModalContent }                  from './rename/rename.component';
import { MessageModalContent }                 from './message/message.component';
import { EmbedModalContent }                   from './embed/embed.component';
import { MergeModalContent }                   from './merge/merge.component';
import { ApplyModalContent }                   from './apply/apply.component';
import { RemoveUserModalContent }              from './remove-user/remove-user.component';
import { RenameServerModalContent }            from './rename-server/rename-server.component';
import { RestartServerModalContent }           from './restart-server/restart-server.component';
import { DetachServerModalContent }            from './detach-server/detach-server.component';
import { ResetServerModalContent }             from './reset-server/reset-server.component';
import { DeleteCloudUserModalContent }         from './delete-cloud-user/delete-cloud-user.component';
import { ChangePasswordModalContent }          from './change-password/change-password.component';
import { UpdateCameraCredentialsModalContent } from './update-camera-credentials/update-camera-credentials.component';
import { CloudStorageDeleteModalContent }      from './cloud-storage/delete/cloud-storage-delete.component';
import { CloudStorageMoveModalContent }        from './cloud-storage/move/cloud-storage-move.component';
import { IParams }                             from '../components/search/search.component';
import './../dialogs/dialogs.scss';
import { Process }                             from '../services/process.service';
import { NxCloudApiService }                   from '../services/nx-cloud-api';

@AutoUnsubscribe()
@Injectable({ providedIn: 'root' })
export class NxDialogsService {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    location: Location;
    closeResult: string;
    account: NxAccountService;

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
        private injector: Injector
    ) {
        this.CONFIG = configService.getConfig();
        this.location = location;
        setTimeout(() => {
            this.account = this.injector.get(NxAccountService);
        }, 0);

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
            actionLabel : this.LANG.dialogs.buttons.ok,
            buttonType  : 'default',
            cancelLabel : this.LANG.dialogs.buttons.cancel,
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
        return this.createModal(ApplyModalContent, {}, { applyFunc, discardFunc, form });
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

    login(keepPage?: boolean, redirectClose?: boolean) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static',
            size        : 'sm'
        };

        const params: IParams = {
            account       : this.account,
            login         : this.login,
            cancellable   : !keepPage || false,
            closable      : true,
            location      : this.location,
            keepPage      : (keepPage !== undefined) ? keepPage : true,
            redirectClose : redirectClose || false
        };

        return this.createModal(LoginModalContent, options, params)
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

    disconnect(systemId: string) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            systemId,
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

    rename(systemId: string, systemName: string) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            systemId,
            systemName,
            closable: true
        };

        return this.createModal(RenameModalContent, options, params);
    }

    renameServer(system: NxSystem, serverId: string, serverName: string) {
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

        return this.createModal(RenameServerModalContent, options, params);
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

    merge(system: NxSystem, systems: NxSystem[]) {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            user     : this.account,
            system,
            systems,
            closable : true
        };

        return this.createModal(MergeModalContent, options, params);
    }

    message(type: string, data: IParams): Promise<any> {
        const options: IParams = {
            windowClass : 'modal-holder',
            backdrop    : 'static'
        };

        const params: IParams = {
            account     : this.account,
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

    updateCameraCredentials(camera: ICamera, system: NxSystem, updateCallback: () => void) {
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
}
