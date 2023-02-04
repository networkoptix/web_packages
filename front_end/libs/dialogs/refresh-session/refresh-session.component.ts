import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import type { RefreshSession as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';

@Component({
    selector: 'nx-modal-refresh-session-content',
    templateUrl: 'refresh-session.component.html',
    styleUrls: []
})
export class RefreshSessionModalContent extends ModalBase<DT['return']> {
    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public system: DT['data'],
    ) {
        super(dialogRef);
    }
}
