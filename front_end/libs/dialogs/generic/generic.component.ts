import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import type { Generic as DialogTypes } from '@dialogs/dialogs.types';

@Component({
    selector: 'nx-modal-generic-content',
    templateUrl: 'generic.component.html',
    styleUrls: ['generic.component.scss']
})
export class GenericModalContent {
    LANG = staticLang;

    constructor(
        public dialogRef: DialogRef<DialogTypes['return']>,
        @Inject(DIALOG_DATA) public dialogData: DialogTypes['data'],
    ) {
        dialogRef.disableClose = dialogData.disableClose;
    }

    close(action?: DialogTypes['return']): void {
        this.dialogRef.close(action);
    }
}
