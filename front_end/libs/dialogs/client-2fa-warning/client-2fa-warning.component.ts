import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import type { Client2faWarning as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import * as staticLang from '@language_static';

@Component({
    selector: 'nx-client-2fa-warning',
    templateUrl: 'client-2fa-warning.component.html',
    styleUrls: [],
    standalone: true,
    imports: [CommonModule, TranslateModule],
})
export class Client2faWarningModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    constructor(dialogRef: DialogRef<DT['return']>) {
        super(dialogRef);
    }
}
