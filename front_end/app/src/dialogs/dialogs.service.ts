import { Injectable } from '@angular/core';
import { Location } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';

import './../dialogs/dialogs.scss';
// import { NxModalLoginComponent }      from './login/login.component';
// import { NxModalGenericComponent }    from './generic/generic.component';
// import { NxModalAddUserComponent }    from './add-user/add-user.component';
// import { NxModalDisconnectComponent } from './disconnect/disconnect.component';
// import { NxModalRenameComponent }     from './rename/rename.component';
// import { NxModalMergeComponent }      from './merge/merge.component';
// import { NxModalEmbedComponent }      from './embed/embed.component';
// import { NxModalMessageComponent }    from './message/message.component';
// import { DefaultGlobalConfig, ToastrService } from 'ngx-toastr';
import { ToastService }              from './toast.service';
import { LoginModalContent }         from './login/login.component';
import { NgbModal }                  from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService } from '../services/nx-language-provider';
import { GenericModalContent }       from './generic/generic.component';
import { AddUserModalContent }       from './add-user/add-user.component';
import { DisconnectModalContent }    from './disconnect/disconnect.component';
import { RenameModalContent }        from './rename/rename.component';
import { MessageModalContent }       from './message/message.component';
import { EmbedModalContent }         from './embed/embed.component';
import { MergeModalContent }         from './merge/merge.component';

@Injectable({ providedIn: 'root' })
export class NxDialogsService {

    LANG: any = {};
    location: any;

    constructor(private toastService: ToastService,
                private modalService: NgbModal,
                private language: NxLanguageProviderService,
                private domSanitizer: DomSanitizer,
                location: Location,
                // private loginModal: NxModalLoginComponent,
                // private genericModal: NxModalGenericComponent,
                // private disconnectModal: NxModalDisconnectComponent,
                // private renameModal: NxModalRenameComponent,
                // private mergeModal: NxModalMergeComponent,
                // private messageModel: NxModalMessageComponent,
                // private embedModal: NxModalEmbedComponent,
                // private addUserModal: NxModalAddUserComponent
    ) {
        this.LANG = this.language.getTranslations();
        this.location = location;
    }

    dismiss() {
        this.toastService.remove();
    }

    notify(message, type, hold?) {
        type = type || 'info';
        hold = hold || false;

        const opt = {
            closeButton: hold,
            tapToDismiss: !hold,
            disableTimeOut: hold
        };

        switch (type) {
            case 'info':
                return this.toastService.show('I am a standard toast');
            case 'error':
            case 'danger':
            case 'warning':
                return this.toastService.show('I am a standard toast');
            case 'success':
                return this.toastService.show('I am a standard toast');
        }

        // return this.toast.create({
        //     additionalClasses: 'button-fix',
        //     className        : type,
        //     content          : message,
        //     dismissOnTimeout : !hold,
        //     dismissOnClick   : !hold,
        //     dismissButton    : hold
        // });
    }

    createModel(modal, options, inputs) {
        const modalRef = this.modalService.open(modal, options);
        return Object.assign(modalRef.componentInstance, inputs);
    }

    alert(message, title) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            message    : this.domSanitizer.bypassSecurityTrustHtml(message),
            title,
            actionLabel: this.LANG.dialogs.okButton,
            buttonType : 'default',
            cancelLabel: this.LANG.dialogs.cancelButton,
            buttonClass: 'btn-primary',
            hasFooter  : true,
            cancellable: true,
            closable   : true,
        };

        return this.createModel(GenericModalContent, options, params)
                .result;
    }

    confirm(message, title, actionLabel, actionType?, cancelLabel?) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            message : this.domSanitizer.bypassSecurityTrustHtml(message),
            title,
            actionLabel,
            buttonType : actionType || 'default',
            cancelLabel,
            buttonClass : actionType || 'btn-primary',
            hasFooter : true,
            cancellable : false,
            closable : true,
        };

        return this.createModel(GenericModalContent, options, params)
                .result;
    }

    login(keepPage?) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static',
            size       : 'sm'
        };

        const params: any = {
            login      : this.login,
            cancellable: !keepPage || false,
            closable   : true,
            location   : this.location,
            keepPage   : (keepPage !== undefined) ? keepPage : true,
        };

        let closeResult: any;
        return this.createModel(LoginModalContent, options, params)
                   .result
                    // handle how the dialog was closed
                    // required if we need to have dismissible dialog otherwise
                    // will raise a JS error ( Uncaught [in promise] )
                   .then((result) => {
                       closeResult = `Closed with: ${result}`;
                   }, (reason) => {
                       closeResult = 'Dismissed';
                   });
    }

    addUser(system?, user?) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            system,
            user,
            closable   : true,
        };

        return this.createModel(AddUserModalContent, options, params)
                .result;
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

        return this.createModel(DisconnectModalContent, options, params)
                .result;
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

        return this.createModel(RenameModalContent, options, params)
                .result;
    }

    merge(system, systems, user) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            user,
            system,
            systems,
            closable   : true,
        };

        return this.createModel(MergeModalContent, options, params)
                .result;
    }

    message(type, data) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            messageType : type,
            data,
            closable: true,
        };

        return this.createModel(MessageModalContent, options, params)
                .result;
    }

    embed(systemId) {
        const options: any = {
            windowClass: 'modal-holder',
            backdrop   : 'static'
        };

        const params: any = {
            closable   : true,
        };

        return this.createModel(EmbedModalContent, options, params)
                .result;
    }
}
