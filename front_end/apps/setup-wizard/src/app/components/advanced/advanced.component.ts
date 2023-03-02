import { KeyValue } from '@angular/common';
import { Component } from '@angular/core';

import staticLang from '@app/language/language_i18n_static.json';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';

import { WizardStateService } from '../../services/wizard-state.service';
import { SECURITY_LEVEL } from '../../types/wizard-state.types';

@Component({
    selector: 'nx-advanced-component',
    templateUrl: 'advanced.component.html',
    styleUrls: ['advanced.component.scss'],
})
export class AdvancedComponent {
    stringBool: { string: boolean };
    itemsSecurity: DropdownItem<SECURITY_LEVEL>[];
    selectedSecurity: DropdownItem<SECURITY_LEVEL>;

    LANG = staticLang;

    constructor(
        public wizardService: WizardStateService
    ) {
        this.itemsSecurity = [
            { value: SECURITY_LEVEL.STANDARD, name: this.LANG.setupWizard.advancedSettings.standard },
            { value: SECURITY_LEVEL.HIGH, name: this.LANG.setupWizard.advancedSettings.high }
        ];

        this.selectedSecurity = this.itemsSecurity.find(item => {
            return item.value === this.wizardService.security;
        });
    }

    onSecurityChange(result: DropdownItem<SECURITY_LEVEL>): void {
        // ensure 'change' will be triggered
        this.selectedSecurity = { ...result };
        this.wizardService.security = this.selectedSecurity.value;
    }

    // Preserve original property order
    originalOrder = (a: KeyValue<string, boolean>, b: KeyValue<string, boolean>): number => {
        return 0;
    };
}
