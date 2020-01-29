import {
    Component, Input, OnInit, Renderer2, ViewEncapsulation
}                                                from '@angular/core';
import { NgbActiveModal, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService }                       from '../../services/nx-config';
import { NxLanguageProviderService }             from '../../services/nx-language-provider';
import { NxProcessService }                      from '../../services/process.service';

@Component({
    selector   : 'nx-modal-remove-user-content',
    templateUrl: 'remove-user.component.html',
    styleUrls  : []
})
export class RemoveUserModalContent {
    @Input() system;
    @Input() user;
    @Input() closable;

    LANG: any;
    CONFIG: any;

    removeUserProcess: any;
    dialogTitle: string;
    dialogButtonText: string;

    constructor(public activeModal: NgbActiveModal,
                private renderer: Renderer2,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private processService: NxProcessService
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        const msg = this.user.isCloud ? 'remove' : 'delete';
        this.dialogTitle = this.LANG.dialogs.titles[`${msg}User`];
        this.dialogButtonText = this.LANG.dialogs.buttons[msg];

        this.removeUserProcess = this.processService.createProcess(() => {
            return this.system.deleteUser(this.user).then(() => {
                return this.system.getUsers(true);
            });
        }, {
            successMessage: this.LANG.toastMessage.system.permissionsRemoved.replace('{{email}}', this.user ? this.user.email : ''),
            errorPrefix   : this.LANG.errorCodes.cantSharePrefix
        }).then(() => {
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }
}
