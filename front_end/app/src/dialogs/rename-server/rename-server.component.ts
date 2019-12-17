import { Component, Input, Renderer2 } from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { NxCloudApiService }           from '../../services/nx-cloud-api';

@Component({
    selector: 'nx-modal-rename-server-content',
    templateUrl: 'rename-server.component.html',
    styleUrls: []
})
export class RenameServerModalContent {
    @Input() serverId;
    @Input() serverName;
    @Input() closable;

    LANG: any;
    renameServer: any;

    constructor(private activeModal: NgbActiveModal,
                private renderer: Renderer2,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
    ) {
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        this.renameServer = this.processService
            .createProcess(() => this.cloudApiService.saveMediaServerUserAttributes(this.serverId, this.serverName),
                { successMessage: this.LANG.servers.successRename })
            .then(() => this.activeModal.close());
    }

    close() {
        this.activeModal.close();
    }
}