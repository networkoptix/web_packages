import { DialogRef } from '@angular/cdk/dialog';
import { Component } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import type { ReserveSpaceWarning as DT } from '@dialogs/dialogs.types';
import { icons } from '@lib/variables/static-variables';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

import { ModalBase } from '../modal-base';

@Component({
    selector: 'nx-reserve-space-warning',
    templateUrl: 'reserve-space-warning.component.html',
    styleUrls: ['reserve-space-warning.component.scss'],
})
export class ReserveSpaceWarningModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    accepted: boolean = false;
    acceptOverwrite: Process;
    icons = icons;

    constructor(private processService: NxProcessService, dialogRef: DialogRef<DT['return']>) {
        super(dialogRef);
        this.acceptOverwrite = this.processService.createProcess(() => {
            this.dialogRef.close(true);
            return Promise.resolve();
        });
    }
}
