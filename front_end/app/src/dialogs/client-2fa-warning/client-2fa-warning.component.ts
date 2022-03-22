import { Component, Inject } from '@angular/core';

import type { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Component({
    selector: 'client-2fa-warning',
    templateUrl: 'client-2fa-warning.component.html',
    styleUrls: []
})
export class Client2faWarningModalContent {
    LANG: LanguageI18NStaticTypes;
    targets = [];

    constructor(
        language: NxLanguageProviderService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.LANG = language.translations;
    }

    close = () => {
        this.dialogRef.close();
    };
}
