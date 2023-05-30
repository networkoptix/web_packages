import { Component, OnInit } from '@angular/core';

import { PreLoaderModule } from '@components/placeholders/pre-loader/pre-loader.module';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-merge-process',
    standalone: true,
    imports: [PreLoaderModule],
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
