import { Component, OnInit } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-init-failure',
    templateUrl: './init-failure.component.html',
    styleUrls: ['./init-failure.component.scss']
})
export class InitFailureComponent implements OnInit {
    constructor(
        public wizardService: WizardStateService
    ) { }

    ngOnInit(): void {
    }

    retry(): void {
        this.wizardService.retry();
    }
}
