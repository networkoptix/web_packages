import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxAccountService } from '@services/account.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { ErrorStateStructure } from '../error-state/error-state-manager';

@Component({
    selector: 'nx-error-state',
    templateUrl: 'error-state.component.html',
    styleUrls: ['error-state.component.scss']
})
export class NxErrorStateComponent {
    @Input() errors: ErrorStateStructure;

    LANG: LanguageI18NStaticTypes;

    constructor(
        public accountService: NxAccountService,
        public route: ActivatedRoute,
        languageService: NxLanguageProviderService,
    ) {
        this.LANG = languageService.translations;
    }

    get errorsToDisplay() {
        const { name: _, ...errors } = this.errors;
        return errors;
    }

    get menuNodeName() {
        const { name } = this.errors;
        return name as string;
    }

    get pendingOrReview() {
        return ['review', 'pending'].includes(this.route.snapshot.queryParams.state);
    }

    hasMoreErrors(node) {
        return typeof node !== 'string';
    }
}
