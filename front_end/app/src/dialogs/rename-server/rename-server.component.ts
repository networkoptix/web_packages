import { Component, Input, ViewChild } from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { LanguageI18NStaticTypes }     from '../../../language_i18n_static_types';

@Component({
    selector   : 'nx-modal-rename-server-content',
    templateUrl: 'rename-server.component.html',
    styleUrls  : ['rename-server.component.scss']
})
export class RenameServerModalContent {
    @Input() system;
    @Input() serverId: string;
    @Input() serverName: string;
    @Input() closable;

    @ViewChild('renameServerForm') renameForm: HTMLFormElement;

    LANG: LanguageI18NStaticTypes;
    renameServer;

    constructor(
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
    ) {
        this.LANG = languageService.getTranslations();
    }

    ngOnInit() {
        this.renameServer = this.processService
            .createProcess(() => this.system.renameServer(this.serverId, this.serverName),
                { successMessage: this.LANG.servers.successRename })
            .then(() => this.activeModal.close(this.serverName));
    }

    verifyName(serverName) {
        if (/^\s+$/.test(serverName)) {
            this.renameForm.form.controls.serverName.setErrors({ invalidInput: true });
        }
        this.serverName = serverName;
    }
}
