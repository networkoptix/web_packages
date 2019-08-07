import {
    Component, Inject, OnInit, Input,
    ViewEncapsulation, Renderer2, ViewChild }    from '@angular/core';
import { Location }                              from '@angular/common';
import { NgbModal, NgbActiveModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { EmailValidator }                        from '@angular/forms';
import { NxLanguageProviderService }             from '../../services/nx-language-provider';
import { NxAccountService }                      from '../../services/account.service';

@Component({
    selector: 'nx-modal-disconnect-content',
    templateUrl: 'disconnect.component.html',
    styleUrls: []
})
export class DisconnectModalContent {
    @Input() systemId;
    @Input() disconnect;
    @Input() closable;

    LANG: any;
    password: string;
    wrongPassword: boolean;
    auth = {
      password: ''
    };

    @ViewChild('disconnectForm', { static: true }) disconnectForm: HTMLFormElement;

    constructor(private activeModal: NgbActiveModal,
                private language: NxLanguageProviderService,
                private account: NxAccountService,
                @Inject('process') private process: any,
                @Inject('cloudApiService') private cloudApi: any,
                private renderer: Renderer2,
    ) {
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        this.auth.password = '';

        this.disconnect = this.process.init(() => {
            this.disconnectForm.controls.password.setErrors(null);
            this.wrongPassword = false;

            return this.cloudApi.disconnect(this.systemId, this.auth.password);
        }, {
            ignoreUnauthorized: true,
            errorCodes: {
                wrongPassword: () => {
                    this.wrongPassword = true;
                    this.auth.password = '';

                    this.renderer.selectRootElement('#password').focus();

                },
            },
            successMessage: this.LANG.system.successDisconnected,
            errorPrefix: this.LANG.errorCodes.cantDisconnectSystemPrefix
        }).then(() => {
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }
}

// @Component({
//     selector: 'nx-modal-disconnect',
//     template: '',
//     encapsulation: ViewEncapsulation.None,
//     styleUrls: []
// })
// export class NxModalDisconnectComponent implements OnInit {
//     modalRef: NgbModalRef;
//     disconnect: any;
//
//     constructor(@Inject('languageService') private language: any,
//                 private location: Location,
//                 private modalService: NgbModal) {
//     }
//
//     private dialog(systemId) {
//         // TODO: Refactor dialog to use generic dialog
//         // TODO: retire loading ModalContent (CLOUD-2493)
//         this.modalRef = this.modalService.open(DisconnectModalContent,
//                 {
//                             windowClass: 'modal-holder',
//                             backdrop: 'static'
//                         });
//         this.modalRef.componentInstance.language = this.language.lang;
//         this.modalRef.componentInstance.disconnect = this.disconnect;
//         this.modalRef.componentInstance.systemId = systemId;
//         this.modalRef.componentInstance.closable = true;
//
//         return this.modalRef;
//     }
//
//     open(systemId) {
//         return this.dialog(systemId).result;
//     }
//
//     ngOnInit() {
//     }
// }
