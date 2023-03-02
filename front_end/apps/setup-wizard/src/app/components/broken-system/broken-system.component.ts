import { Component, OnInit } from '@angular/core';

import { icons } from '@lib/variables/static-variables';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-broken-system',
    templateUrl: './broken-system.component.html',
    styleUrls: ['./broken-system.component.scss'],
})
export class BrokenSystemComponent implements OnInit {
    icons = icons;

    constructor(
        public wizardService: WizardStateService
    ) { }

    ngOnInit(): void {
    }

    retry(): void {
        this.wizardService.retry();
    }
}
