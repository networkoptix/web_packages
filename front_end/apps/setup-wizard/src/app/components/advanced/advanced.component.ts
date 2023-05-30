import { CommonModule, KeyValue } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import staticLang from '@app/language/language_i18n_static.json';
import { CheckboxModule } from '@components/checkbox/checkbox.module';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { PipesModule } from '@pipes/pipes.module';

import { WizardStateService } from '../../services/wizard-state.service';
import { SECURITY_LEVEL } from '../../types/wizard-state.types';

@Component({
    selector: 'nx-advanced-component',
    standalone: true,
    imports: [CommonModule, FormsModule, PipesModule, CheckboxModule, NxGenericDropdownModule],
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
