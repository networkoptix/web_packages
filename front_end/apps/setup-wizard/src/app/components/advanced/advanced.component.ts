import { KeyValue } from '@angular/common';
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
            { value: 'high', name: translate.instant('setupWizard.advancedSettings.high') }
        ];

        this.selectedSecurity = this.itemsSecurity[0];
        this.wizardService.setSecurityLevel(this.selectedSecurity.value);
    }

    onSecurityChange(result: DropdownItem<string>): void {
        // ensure 'change' will be triggered
        this.selectedSecurity = { ...result };
        this.wizardService.setSecurityLevel(this.selectedSecurity.value);
    }

    // Preserve original property order
    originalOrder = (a: KeyValue<string, boolean>, b: KeyValue<string, boolean>): number => {
        return 0;
    };
}
