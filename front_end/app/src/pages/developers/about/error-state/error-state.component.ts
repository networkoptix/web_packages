import { Component, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NxAccountService } from '@services/account.service';

import { ErrorStateStructure } from '../error-state/error-state-manager';

@Component({
    selector: 'nx-error-state',
    templateUrl: 'error-state.component.html',
    styleUrls: ['error-state.component.scss']
})
export class NxErrorStateComponent {
    @Input() errors: ErrorStateStructure;

    constructor(
        public accountService: NxAccountService,
        public route: ActivatedRoute
    ) {}

    get errorsToDisplay() {
        const { name, ...errors } = this.errors;
        return errors;
    }

    get menuNodeName() {
        const { name } = this.errors;
        return name;
    }

    get pendingOrReview() {
        return ['review', 'pending'].includes(this.route.snapshot.queryParams.state);
    }

    hasMoreErrors(node) {
        return typeof node !== 'string';
    }
};
