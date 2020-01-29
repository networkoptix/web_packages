import { Component, Input }            from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';

@Component({
    selector: 'nx-modal-rename-server-content',
    templateUrl: 'rename-server.component.html',
    styleUrls: []
})
export class RenameServerModalContent {
    @Input() system: any;
    @Input() serverId: string;
    @Input() serverName: string;
    @Input() closable: any;

    LANG: any;
    renameServer: any;

    constructor(private activeModal: NgbActiveModal,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
    ) {
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        this.renameServer = this.processService
            .createProcess(() => this.system.renameServer(this.serverId, this.serverName),
                { successMessage: this.LANG.toastMessage.system.rename.success })
            .then(() => this.activeModal.close());
    }

    close() {
        this.activeModal.close();
    }
}
