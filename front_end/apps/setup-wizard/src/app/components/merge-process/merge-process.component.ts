import { Component, OnInit } from '@angular/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-merge-process',
    standalone: true,
    imports: [NxPreLoaderComponent],
    templateUrl: './merge-process.component.html',
    styleUrls: ['./merge-process.component.scss'],
})
export class MergeProcessComponent implements OnInit {
    constructor(public wizardService: WizardStateService) {}

    ngOnInit(): void {
        this.wizardService.connectToAnotherSystem();
    }
}
