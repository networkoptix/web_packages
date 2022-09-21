import { Component } from '@angular/core';

import type { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { DialogRef } from '@dialogs/dialog-ref';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Component({
    selector: 'nx-client-2fa-warning',
    templateUrl: 'client-2fa-warning.component.html',
    styleUrls: []
})
export class Client2faWarningModalContent {
    LANG: LanguageI18NStaticTypes;

    constructor(
        language: NxLanguageProviderService,
        private dialogRef: DialogRef,
        // @Inject(DIALOG_DATA) private dialogData: never,
    ) {
        this.LANG = language.translations;
    }

    close = (): void => {
        this.dialogRef.close();
    };
}
