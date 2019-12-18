import { Component, Input, Renderer2 } from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { NxCloudApiService }           from '../../services/nx-cloud-api';

@Component({
    selector: 'nx-modal-reset-server-content',
    templateUrl: 'reset-server.component.html',
    styleUrls: []
})
export class ResetServerModalContent {
    // @Input() serverId;
    // @Input() serverName;
    @Input() closable;

    LANG: any;
    resetServer: any;

    constructor(private activeModal: NgbActiveModal,
                private renderer: Renderer2,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
    ) {
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        // this.resetServer = this.processService
        //     .createProcess(() => this.cloudApiService.saveMediaServerUserAttributes(this.serverId, this.serverName),
        //         { successMessage: this.LANG.servers.successRename })
        //     .then(() => this.activeModal.close());
    }

    close() {
        this.activeModal.close();
    }
}