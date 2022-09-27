import { Component, OnInit } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'app-local-failure',
    templateUrl: './local-failure.component.html',
    styleUrls: ['./local-failure.component.scss']
})
export class LocalFailureComponent implements OnInit {
    constructor(private wizardService: WizardStateService) { }

    ngOnInit(): void {
    }

    retry(): void {
        this.wizardService.retry();
    }
}
