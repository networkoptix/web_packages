import { Component, Inject, Input } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
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

    CONFIG: IConfig;
    LANG = staticLang;

    system: NxSystem;
    setDefaultBackupSettings: () => Promise<any>;
    resetBackupProcess: Process;

    constructor(
        configService: NxConfigService,
        private processService: NxProcessService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = configService.getConfig();
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
