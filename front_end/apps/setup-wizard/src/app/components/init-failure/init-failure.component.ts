import { Component, OnInit } from '@angular/core';

import { icons } from '@lib/variables/static-variables';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-init-failure',
    templateUrl: './init-failure.component.html',
    styleUrls: ['./init-failure.component.scss'],
})
export class InitFailureComponent implements OnInit {
    icons = icons;

    constructor(public wizardService: WizardStateService) {}

    ngOnInit(): void {}

    retry(): void {
        this.wizardService.retry();
    }
}
