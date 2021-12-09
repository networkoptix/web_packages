import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem } from '@services/system.service';

@Component({
    selector: 'nx-modal-reset-backup',
    templateUrl: 'reset-backup.component.html',
    styleUrls: []
})
export class ResetBackupModalContent {
    @Input() system: NxSystem;
    @Input() closable: boolean;
    @Input() setDefaultBackupSettings: () => Promise<any>;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    resetBackupProcess: Process;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit() {
        this.resetBackupProcess = this.processService.createProcess(() => {
            return this.setDefaultBackupSettings();
        }, { ignoreError: true }).then(() => {
            this.activeModal.close();
        });
    }

    close() {
        this.activeModal.close();
    }
}
