import { Component } from '@angular/core';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-advanced-component',
    templateUrl: 'advanced.component.html'
})
export class AdvancedComponent {
    stringBool: { string: boolean };
    constructor(
        public wizardService: WizardStateService
    ) {}
}
