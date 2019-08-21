import {
    Component, Inject, Input,
    Renderer2, ViewChild
}                                    from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import {NxProcessService} from "../../services/process.service";
import {NxCloudApiService} from "../../services/nx-cloud-api";

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
                private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private renderer: Renderer2,
    ) {
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        this.auth.password = '';

        this.disconnect = this.processService.createProcess(() => {
            this.disconnectForm.controls.password.setErrors(undefined);
            this.wrongPassword = false;

            return this.cloudApiService.disconnect(this.systemId, this.auth.password).toPromise();
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
        });
        this.disconnect.then(() => {
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
