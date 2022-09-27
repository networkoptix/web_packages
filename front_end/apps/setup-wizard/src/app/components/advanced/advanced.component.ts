import { Component } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'advanced-component',
    templateUrl: 'advanced.component.html'
})
export class AdvancedComponent {
    stringBool: { string: boolean };
    constructor(
        public wizardService: WizardStateService
    ) {}
}
