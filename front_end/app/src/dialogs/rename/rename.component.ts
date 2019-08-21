import { Component, Input, Renderer2 } from '@angular/core';
import { NgbActiveModal }                      from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }           from '../../services/nx-language-provider';
import { NxProcessService }                    from '../../services/process.service';
import { NxCloudApiService }                   from '../../services/nx-cloud-api';

@Component({
    selector: 'nx-modal-rename-content',
    templateUrl: 'rename.component.html',
    styleUrls: []
})
export class RenameModalContent {
    @Input() systemId;
    @Input() systemName;
    @Input() closable;

    LANG: any;
    rename: any;

    constructor(private activeModal: NgbActiveModal,
                private renderer: Renderer2,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
    ) {
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        this.rename = this.processService.createProcess(() => {
            return this.cloudApiService.renameSystem(this.systemId, this.systemName);
        }, {
            successMessage: this.LANG.system.successRename
        });
        this.rename.then(() => {
            this.activeModal.close(this.systemName);
        });
    }

    close() {
        this.activeModal.close();
    }
}

// @Component({
//     selector: 'nx-modal-rename',
//     template: '',
//     encapsulation: ViewEncapsulation.None,
//     styleUrls: []
// })
// export class NxModalRenameComponent implements OnInit {
//     modalRef: NgbModalRef;
//
//     constructor(@Inject('languageService') private language: any,
//                 private modalService: NgbModal) {
//     }
//
//     private dialog(systemId, systemName) {
//         // TODO: Refactor dialog to use generic dialog
//         // TODO: retire loading ModalContent (CLOUD-2493)
//         this.modalRef = this.modalService.open(RenameModalContent,
//                 {
//                             windowClass: 'modal-holder',
//                             backdrop: 'static'
//                         });
//         this.modalRef.componentInstance.language = this.language.lang;
//         this.modalRef.componentInstance.systemId = systemId;
//         this.modalRef.componentInstance.systemName = systemName;
//         this.modalRef.componentInstance.closable = true;
//
//         return this.modalRef;
//     }
//
//     open(systemId, systemName) {
//         return this.dialog(systemId, systemName).result;
//     }
//
//     ngOnInit() {
//     }
// }
