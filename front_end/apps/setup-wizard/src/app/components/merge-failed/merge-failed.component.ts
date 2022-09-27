import { Component, OnInit } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'app-merge-failed',
    templateUrl: './merge-failed.component.html',
    styleUrls: ['./merge-failed.component.scss']
})
export class MergeFailedComponent implements OnInit {
    constructor(private wizardService: WizardStateService) { }

    ngOnInit(): void {
    }

    retry(): void {
        this.wizardService.retry();
    }

    skip(): void {
        this.wizardService.skip();
    }
}
