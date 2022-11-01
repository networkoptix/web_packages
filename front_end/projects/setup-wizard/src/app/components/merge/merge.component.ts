import { Component } from '@angular/core';

import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';

import { WizardStateService } from '../../services/wizard-state.service';

@Component({
    selector: 'nx-merge-component',
    templateUrl: 'merge.component.html',
    // styleUrls: ['merge.component.scss']
})
export class MergeComponent {
    item: DropdownItem<string>;
    items: DropdownItem<string>[];
    constructor(
        public wizardService: WizardStateService
    ) {}
}
