import { Inject, Injectable } from '@angular/core';
import { DOCUMENT, Location } from '@angular/common';
import { DomSanitizer }       from '@angular/platform-browser';
import { NgbModal }           from '@ng-bootstrap/ng-bootstrap';
import { Router }             from '@angular/router';

import './../dialogs/dialogs.scss';

import { NxToastService }             from './toast.service';
import { NxConfigService }            from '../services/nx-config';
import { NxLanguageProviderService }  from '../services/nx-language-provider';
import { NxAccountService }           from '../services/account.service';

import { LoginModalContent }          from './login/login.component';
import { GenericModalContent }        from './generic/generic.component';
import { AddUserModalContent }        from './add-user/add-user.component';
import { DisconnectModalContent }     from './disconnect/disconnect.component';
import { RenameModalContent }         from './rename/rename.component';
import { MessageModalContent }        from './message/message.component';
import { EmbedModalContent }          from './embed/embed.component';
import { MergeModalContent }          from './merge/merge.component';
import { ApplyModalContent }          from './apply/apply.component';
import { RemoveUserModalContent }     from './remove-user/remove-user.component';
import { RenameServerModalContent }   from './rename-server/rename-server.component';
import { RestartServerModalContent }  from './restart-server/restart-server.component';
import { DetachServerModalContent }   from './detach-server/detach-server.component';
import { ResetServerModalContent }    from './reset-server/reset-server.component';
import { ChangePasswordModalContent } from './change-password/change-password.component';

@Injectable({ providedIn: 'root' })
export class NxDialogsService {

    LANG: any = {};
    CONFIG: any = {};
    location: any;
    closeResult: any;

    constructor(configService: NxConfigService,
                location: Location,
                @Inject(DOCUMENT) private document: any,
                private modalService: NgbModal,
                private toastService: NxToastService,
                private language: NxLanguageProviderService,
                private domSanitizer: DomSanitizer,
                private router: Router,
    ) {
        this.LANG = this.language.getTranslations();
        this.CONFIG = configService.getConfig();
        this.location = location;
    }

    dismiss() {
        this.toastService.remove();
    }

    notify(message, type, hold?) {
        type = type || this.CONFIG.toast.info;
        hold = hold || false;

        const options = {
            autohide: !hold,
            classname: type,
            delay: this.CONFIG.alertTimeout
        };

        return this.toastService.show(message, options);
    }

    createModal(modal, options, inputs) {
        const modalRef = this.modalService.open(modal, options);
        Object.assign(modalRef.componentInstance, inputs);
        return modalRef.result;
    }

    alert(message, title, footerClass?) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            message    : this.domSanitizer.bypassSecurityTrustHtml(message),
            title,
            actionLabel: this.LANG.dialogs.buttons.ok,
            buttonType : 'default',
            cancelLabel: this.LANG.dialogs.buttons.cancel,
            buttonClass: 'btn-primary',
            footerClass: footerClass || '',
            hasFooter  : true,
            cancellable: true,
            closable   : true,
        };

        return this.createModal(GenericModalContent, options, params);
    }

    apply(applyFunc, discardFunc, form) {
        // Blur activeElement to prevent ExpressionChangedAfterItHasBeenCheckedError
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        return this.createModal(ApplyModalContent, {}, {applyFunc, discardFunc, form});
    }

    confirm(message, title, actionLabel, actionType?, cancelLabel?, footerClass?) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            message : message ? this.domSanitizer.bypassSecurityTrustHtml(message) : '',
            title,
            actionLabel,
            buttonType : actionType || 'default',
            cancelLabel,
            buttonClass : actionType || 'btn-primary',
            footerClass: footerClass || '',
            hasFooter : true,
            cancellable : false,
            closable : true,
        };

        return this.createModal(GenericModalContent, options, params);
    }

    login(account: NxAccountService, keepPage?, redirectClose?) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static',
            size       : 'sm'
        };

        const params: any = {
            account,
            login        : this.login,
            cancellable  : !keepPage || false,
            closable     : true,
            location     : this.location,
            keepPage     : (keepPage !== undefined) ? keepPage : true,
            redirectClose: redirectClose || false
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
            }, (reason) => {
                this.closeResult = 'Dismissed';
            });
    }

    addUser(account, system, user?) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            account,
            system,
            user,
            closable   : true,
        };

        return this.createModal(AddUserModalContent, options, params);
    }

    disconnect(systemId) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            systemId,
            closable: true,
        };

        return this.createModal(DisconnectModalContent, options, params);
    }

    removeUser(system, user) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            system,
            user,
            closable   : true,
        };

        return this.createModal(RemoveUserModalContent, options, params);
    }

    rename(systemId, systemName) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            systemId,
            systemName,
            closable: true,
        };

        return this.createModal(RenameModalContent, options, params);
    }

    renameServer(system, serverId, serverName) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            system,
            serverId,
            serverName,
            closable: true,
        };

        return this.createModal(RenameServerModalContent, options, params);
    }

    restartServer(system, serverId, serverName) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            system,
            serverId,
            serverName,
            closable: true,
        };

        return this.createModal(RestartServerModalContent, options, params);
    }

    detachServer(system, serverId, serverName) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            system,
            serverId,
            serverName,
            closable: true,
        };

        return this.createModal(DetachServerModalContent, options, params);
    }

    resetServer(system, serverId, serverName) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            system,
            serverId,
            serverName,
            closable: true,
        };

        return this.createModal(ResetServerModalContent, options, params);
    }

    changePassword(system, user) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            system,
            user,
            closable: true,
        };

        return this.createModal(ChangePasswordModalContent, options, params);
    }

    merge(system, systems, peerSystems, user) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            user,
            system,
            systems,
            peerSystems,
            closable   : true,
        };

        return this.createModal(MergeModalContent, options, params);
    }

    message(account: NxAccountService, type, data): Promise<any> {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            account,
            messageType : type,
            data,
            closable: true,
        };

        return this.createModal(MessageModalContent, options, params);
    }

    embed(systemId) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            closable   : true,
        };

        return this.createModal(EmbedModalContent, options, params);
    }
}
