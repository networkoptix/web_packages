import { Component, OnInit } from '@angular/core';

import { icons } from '@lib/variables/static-variables';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-merge-failed',
    templateUrl: './merge-failed.component.html',
    styleUrls: ['./merge-failed.component.scss']
})
export class MergeFailedComponent implements OnInit {
    icons = icons;
    constructor(
        public wizardService: WizardStateService
    ) { }

    ngOnInit(): void {
    }
}
