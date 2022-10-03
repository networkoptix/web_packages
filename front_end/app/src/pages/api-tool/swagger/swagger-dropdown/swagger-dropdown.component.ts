import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import { NxAPIToolService } from '@pages/api-tool/api-tool.service';

@Component({
    selector: 'nx-swagger-dropdown',
    templateUrl: './swagger-dropdown.component.html',
    styleUrls: ['./swagger-dropdown.component.scss']
})
export class NxSwaggerDropdownComponent implements OnInit, OnDestroy {
    @Input() swaggerSelect
    dropdownOptions = [];
    isDisabled = true;
    disabledMutationObserver: MutationObserver;

    isMultiSelect = false;
    selectedOptions = []; // For multiselect only

    constructor(private APIToolService: NxAPIToolService) { }

    onSelect = (e: any) => {
        this.APIToolService.preventNextChangeDetection = true;
        this.swaggerSelect.value = e.value;
        this.swaggerSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    onMultiSelect = (e: any) => {
        this.APIToolService.preventNextChangeDetection = true;
        this.selectedOptions = [...e];
        for (const option of this.swaggerSelect.options) {
            if (this.selectedOptions.includes(option.value)) {
                option.selected = true;
            } else {
                option.selected = false;
            }
        }

        this.swaggerSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    ngOnInit() {
        const options: NodeListOf<HTMLOptionElement> = this.swaggerSelect.querySelectorAll('option');
        for (const option of options) {
            if (this.isMultiSelect) {
                if (option.innerText !== '--') {
                    this.dropdownOptions.push({
                        name: option.innerText,
                        value: option.value,
                        label: option.innerText,
                        id: option.value
                    });
                }
            } else {
                this.dropdownOptions.push({
                    name: option.innerText,
                    value: option.value
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
        this.disabledMutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'disabled') {
                    this.isDisabled = mutation.oldValue !== '';
                }
            });
        });
        this.disabledMutationObserver.observe(this.swaggerSelect, {
            attributes: true,
            attributeOldValue: true
        });
    }

    ngOnDestroy() {
        this.disabledMutationObserver.disconnect();
        this.swaggerSelect = null;
    }
}
