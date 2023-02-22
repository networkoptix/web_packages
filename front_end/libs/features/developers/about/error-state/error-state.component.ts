import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';

import staticLang from '@common/language/language_i18n_static.json';
import { selectCurrentUser } from '@common/store/account/account.selectors';
import type { Account } from '@services/account.service/account';

import { ErrorStateStructure } from '../error-state/error-state-manager';

@Component({
    selector: 'nx-error-state',
    templateUrl: 'error-state.component.html',
    styleUrls: ['error-state.component.scss'],
})
export class NxErrorStateComponent {
    @Input() errors: ErrorStateStructure;

    LANG = staticLang;

    currentUser$ = this.store.select<Account>(selectCurrentUser);

    constructor(

        private route: ActivatedRoute,
        private store: Store,
    ) {

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
