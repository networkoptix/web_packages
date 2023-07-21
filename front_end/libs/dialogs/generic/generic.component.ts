import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';

import type { Generic as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { PipesModule } from '@pipes/pipes.module';

@Component({
    selector: 'nx-modal-generic-content',
    templateUrl: 'generic.component.html',
    styleUrls: ['generic.component.scss'],
    standalone: true,
    imports: [CommonModule, PipesModule],
})
export class GenericModalContent extends ModalBase<DT['return']> {
    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public dialogData: DT['data'],
    ) {
        super(dialogRef);
        dialogRef.disableClose = dialogData.disableClose;
    }
}
