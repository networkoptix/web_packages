import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import type { RefreshSession as DialogTypes } from '@dialogs/dialogs.types';

@Component({
    selector: 'nx-modal-refresh-session-content',
    templateUrl: 'refresh-session.component.html',
    styleUrls: []
})
export class RefreshSessionModalContent {
    constructor(
        public dialogRef: DialogRef<DialogTypes['return']>,
        @Inject(DIALOG_DATA) public system: DialogTypes['data'],
    ) {
    }

    close = (msg?: DialogTypes['return']): void => {
        this.dialogRef.close(msg);
    };
}
