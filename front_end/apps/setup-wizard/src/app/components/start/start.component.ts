import { Component, OnInit } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-start',
    templateUrl: './start.component.html',
    styleUrls: ['./start.component.scss']
})
export class StartComponent implements OnInit {
    constructor(private wizardService: WizardStateService) { }

    ngOnInit(): void {
    }

    mergeSystem(): void {
        this.wizardService.skip();
    }

    setupSystem(): void {
        this.wizardService.next();
    }
}
