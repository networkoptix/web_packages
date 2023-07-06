import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import type { ResetBackup as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';

@Component({
    selector: 'nx-modal-reset-backup',
    templateUrl: 'reset-backup.component.html',
    styleUrls: [],
})
export class ResetBackupModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    system: NxSystem;
    resetBackupProcess: Process;

    constructor(
        private processService: NxProcessService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { system, setDefaultBackupSettings }: DT['data'],
    ) {
        super(dialogRef);

        this.system = system;

        this.resetBackupProcess = this.processService.createProcess(
            () => {
                this.lock();
                return setDefaultBackupSettings();
            },
            { ignoreError: true },
            () => {
                this.close();
            },
            err => {
                console.error(err);
                this.unlock();
            },
        );
    }
}
