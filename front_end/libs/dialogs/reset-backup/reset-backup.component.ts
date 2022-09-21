import { Component, Inject, Input } from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { pickFrom } from '@utils/general';

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

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system', 'setDefaultBackupSettings'], this);

        this.resetBackupProcess = this.processService.createProcess(() => {
            return this.setDefaultBackupSettings();
        }, { ignoreError: true }).then(() => {
            this.close();
        });
    }

    close = (): void => {
        this.dialogRef.close();
    };
}
