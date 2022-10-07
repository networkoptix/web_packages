import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-advanced-component',
    templateUrl: 'advanced.component.html'
})
export class AdvancedComponent {
    stringBool: { string: boolean };
    itemsSecurity: DropdownItem<string>[];
    selectedSecurity: DropdownItem<string>;

    constructor(
        translate: TranslateService,
        public wizardService: WizardStateService
    ) {
        this.itemsSecurity = [
            { value: 'standard', name: translate.instant('setupWizard.advancedSettings.standard') },
            { value: 'safe', name: translate.instant('setupWizard.advancedSettings.safe') }
        ];

        this.selectedSecurity = this.itemsSecurity[0];
    }

    onSecurityChange(result: DropdownItem<string>): void {
        // ensure 'change' will be triggered
        this.selectedSecurity = { ...result };
        this.wizardService.setSecurityLevel(this.selectedSecurity.value);
    }
}
