import { Component, Inject, Input } from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem } from '@services/system.service';
import { NxUtilsService } from '@services/utils.service';

@Component({
    selector: 'nx-modal-reset-backup',
    templateUrl: 'reset-backup.component.html',
    styleUrls: []
})
export class ResetBackupModalContent {
    @Input() closable: boolean = true;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    system: NxSystem;
    setDefaultBackupSettings: () => Promise<any>;
    resetBackupProcess: Process;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private processService: NxProcessService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit() {
        NxUtilsService.pickFrom(this.dialogData, ['system', 'setDefaultBackupSettings'], this);

        this.resetBackupProcess = this.processService.createProcess(() => {
            return this.setDefaultBackupSettings();
        }, { ignoreError: true }).then(() => {
            this.close();
        });
    }

    close = () => {
        this.dialogRef.close();
    }
}
