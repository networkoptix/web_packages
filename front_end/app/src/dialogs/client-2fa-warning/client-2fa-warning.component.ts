import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import type { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
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
        public activeModal: NgbActiveModal,
        language: NxLanguageProviderService,
    ) {
        this.LANG = language.translations;
    }
}
