import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { NgxTranslateCutModule } from 'ngx-translate-cut';

import type { CantEnableSystem2fa as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';

@Component({
    selector: 'nx-cant-enable-system-2fa',
    templateUrl: 'cant-enable-system-2fa.component.html',
    styleUrls: ['cant-enable-system-2fa.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        TranslateModule,
        NgxTranslateCutModule,
        LetDirective,
    ],
})
export class NxCantEnableSystem2faModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    constructor(dialogRef: DialogRef<DT['return']>) {
        super(dialogRef);
    }
}
