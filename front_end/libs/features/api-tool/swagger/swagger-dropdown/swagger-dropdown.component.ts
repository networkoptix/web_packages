import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type { MultiSelectItem } from '@components/dropdowns/multi-select/multi-select.component.types';
import { NxAPIToolSystemService } from '@pages/api-tool/services/api-tool-system.service';

type SingleDropdownOption = DropdownItem<string>;

@Component({
    selector: 'nx-swagger-dropdown',
    templateUrl: './swagger-dropdown.component.html',
    styleUrls: ['./swagger-dropdown.component.scss'],
})
export class NxSwaggerDropdownComponent implements OnInit, OnDestroy {
    @Input() swaggerSelect: HTMLSelectElement;
    singleDropdownOptions: SingleDropdownOption[] = [];
    multiDropdownOptions: MultiSelectItem[] = [];
    isDisabled = true;
    disabledMutationObserver: MutationObserver;

    isMultiSelect = false;
    selectedOptions: string[] = []; // For multiselect only

    constructor(private APIToolService: NxAPIToolSystemService) {}

    onSelect = (option: SingleDropdownOption): void => {
        this.APIToolService.preventNextChangeDetection = true;
        this.swaggerSelect.value = option.value;
        this.swaggerSelect.dispatchEvent(new Event('change', { bubbles: true }));
    };

    onMultiSelect = (options: string[]): void => {
        this.APIToolService.preventNextChangeDetection = true;
        this.selectedOptions = [...options];
        for (const option of this.swaggerSelect.options) {
            option.selected = this.selectedOptions.includes(option.value);
        }

        this.swaggerSelect.dispatchEvent(new Event('change', { bubbles: true }));
    };

    ngOnInit(): void {
        const options = this.swaggerSelect.querySelectorAll('option');
        for (const option of options) {
            if (this.isMultiSelect) {
                if (option.innerText !== '--') {
                    this.multiDropdownOptions.push({
                        label: option.innerText,
                        id: option.value,
                    });
                }
            } else {
                this.singleDropdownOptions.push({
                    name: option.innerText,
                    value: option.value,
                });
            }
        }

        if (this.isMultiSelect) {
            if (this.swaggerSelect?.options[1]?.selected) {
                this.swaggerSelect.options[1].selected = false;
            }
            this.swaggerSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Initially set isDisabled
        this.isDisabled = this.swaggerSelect.getAttribute('disabled') === '';

        // Listen to the original select element's 'disabled' attribute
        // to see if the nx-select should be disabled or not
        this.disabledMutationObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'disabled') {
                    this.isDisabled = mutation.oldValue !== '';
                }
            });
        });
        this.disabledMutationObserver.observe(this.swaggerSelect, {
            attributes: true,
            attributeOldValue: true,
        });
    }

    ngOnDestroy(): void {
        this.disabledMutationObserver.disconnect();
        this.swaggerSelect = null;
    }
}
