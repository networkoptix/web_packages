import { Component } from '@angular/core';

import * as staticLang from '@common/language/language_i18n_static.json';
import { DialogRef } from '@dialogs/dialog-ref';

@Component({
    selector: 'nx-client-2fa-warning',
    templateUrl: 'client-2fa-warning.component.html',
    styleUrls: []
})
export class Client2faWarningModalContent {
    LANG = staticLang;
    constructor(
        private dialogRef: DialogRef,
        // @Inject(DIALOG_DATA) private dialogData: never,
    ) {
    }

    close = (): void => {
        this.dialogRef.close();
    };
}
