import { Component, OnInit } from '@angular/core';

import { icons } from '@lib/variables/static-variables';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-error',
    templateUrl: './error.component.html',
    styleUrls: ['./error.component.scss'],
})
export class ErrorComponent implements OnInit {
    icons = icons;

    constructor(public wizardService: WizardStateService) {}
    ngOnInit(): void {}
}
