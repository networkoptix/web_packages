import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { NxAlertBlockComponent } from '@components/content-block/alert/block.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import type { ReserveSpaceWarning as DT } from '@dialogs/dialogs.types';
import staticLang from '@language_static';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { icons } from '@static-variables';

import { ModalBase } from '../modal-base';

@Component({
    selector: 'nx-reserve-space-warning',
    templateUrl: 'reserve-space-warning.component.html',
    styleUrls: ['reserve-space-warning.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxAlertBlockComponent,
        NxCheckboxComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class ReserveSpaceWarningModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    accepted: boolean = false;
    acceptOverwrite: Process;
    icons = icons;

    constructor(
        private processService: NxProcessService,
        dialogRef: DialogRef<DT['return']>,
    ) {
        super(dialogRef);
        this.acceptOverwrite = this.processService.createProcess(() => {
            this.dialogRef.close(true);
            return Promise.resolve();
        });
    }
}
