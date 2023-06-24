import { Component, OnInit } from '@angular/core';

import { icons } from '@lib/variables/static-variables';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-local-failure',
    templateUrl: './local-failure.component.html',
    styleUrls: ['./local-failure.component.scss'],
})
export class LocalFailureComponent implements OnInit {
    icons = icons;

    constructor(public wizardService: WizardStateService) {}

    ngOnInit(): void {}

    retry(): void {
        this.wizardService.retry();
    }
}
