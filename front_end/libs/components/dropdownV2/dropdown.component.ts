import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { Component, OnChanges, forwardRef } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NgChanges } from '@utils/ng-changes';

import { BaseDropdownComponent } from './base-dropdown.component';
import { BaseDropdownInjectionToken } from './dropdown.types';
import { BaseDropdownItem } from './dropdownItems//baseDropdownItem/dropdown-item.component';

@Component({
    imports: [CommonModule, AngularSvgIconModule, OverlayModule, PortalModule],
    selector: 'nx-dropdown',
    templateUrl: 'dropdown.component.html',
    styleUrls: ['dropdown.component.scss'],
    standalone: true,
    providers: [
        {
            provide: BaseDropdownInjectionToken,
            useExisting: forwardRef(() => NxDropdownComponent),
        },
    ],
})
export class NxDropdownComponent<T> extends BaseDropdownComponent<T, false> implements OnChanges {
    // The selected DropdownItem
    private selectedOptionComponent: BaseDropdownItem<T | undefined> | undefined;

    ngOnChanges(changes: NgChanges<NxDropdownComponent<unknown>>): void {
        if (changes.selected) {
            this.manuallySetSelectedOption();
            this.setPlaceholderOrDisplayText();
        }
    }

    handleSelectionChange(): void {
        const updatedSelect = this.selectedOptionComponent?.value;
        this.selectedChange.emit(updatedSelect);
        this.onChange.emit(updatedSelect);
    }

    override handleOptionSelected(option: BaseDropdownItem<T>): void {
        this.hideDropdown();
        super.handleOptionSelected(option);
    }

    protected updateSelectedOptionComponent(option: BaseDropdownItem<T>): void {
        if (this.selectedOptionComponent !== option) {
            // If the option value is undefined, then we assume the user wants to clear the selection
            // This functionality is only needed for single select dropdowns
            this.selectedOptionComponent = option.value === undefined ? undefined : option;
        }
    }

    // Called when the selected value is set or changed outside of this component
    protected manuallySetSelectedOption(): void {
        if (this.selected !== undefined) {
            // find the dropdownItem that matches the selected value
            this.dropdownItems.forEach(item => {
                if (item.value === this.selected) {
                    this.selectedOptionComponent = item;
                }
            });
        }
    }

    protected setPlaceholderOrDisplayText(): void {
        // If no option is selected, show the placeholder
        if (this.selectedOptionComponent === undefined) {
            this.displayText = this.domSanitizer.bypassSecurityTrustHtml(this.placeholder);
            this.showPlaceholder = true;
        } else {
            this.displayText = this.domSanitizer.bypassSecurityTrustHtml(
                this.selectedOptionComponent.getOptionHtml(),
            );
        }
        this.showPlaceholder = false;
    }
}
