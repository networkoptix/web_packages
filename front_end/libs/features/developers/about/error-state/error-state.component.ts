import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { selectCurrentUser } from '@common/store/account/account.selectors';
import type { Account } from '@services/account.service/account';
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

    currentUser$ = this.store.select<Account>(selectCurrentUser);

    constructor(
        languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
        private store: Store,
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
