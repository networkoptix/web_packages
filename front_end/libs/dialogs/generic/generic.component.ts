import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import type { Generic as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';

@Component({
    selector: 'nx-modal-generic-content',
    templateUrl: 'generic.component.html',
    styleUrls: ['generic.component.scss']
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
