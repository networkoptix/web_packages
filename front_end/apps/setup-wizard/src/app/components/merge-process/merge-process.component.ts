import { Component, OnInit } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-merge-process',
    templateUrl: './merge-process.component.html',
    styleUrls: ['./merge-process.component.scss'],
})
export class MergeProcessComponent implements OnInit {
    constructor(
      private wizardService: WizardStateService
    ) { }

    ngOnInit(): void {
        this.wizardService.connectToAnotherSystem();
    }
}
