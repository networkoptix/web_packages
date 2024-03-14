import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { Component, OnChanges, forwardRef } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { of } from 'rxjs';

import { PipesModule } from '@pipes/pipes.module';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdownComponent } from './base-dropdown.component';
import { BaseDropdownInjectionToken, DropdownState } from './dropdown.types';
import { BaseDropdownItem } from './dropdownItems//baseDropdownItem/dropdown-item.component';

/* https://material.angular.io/components/select/overview
Going to mostly borrow behavior from Material Select for now
- Keyboard focus on button does not open dropdown
- Keyboard blur from button closes dropdown
    - Material also selects on blur, but this isn't seen anywhere else so we're leaving this out
- Clicking on the button toggles dropdown
- Clicking outside the element (button + dropdown) closes the dropdown
- When opening, highlight is set to selected option if selection, first enabled otherwise

- Focus stays on button
    - Dropdown options are not keyboard focusable
- Esc closes the dropdown
- L/R/U/D arrows DO NOT open the dropdown
- If dropdown is open
    - L/R do nothing
    - U/D increment/decrement HIGHLIGHT
    - Material allows highlighting disabled options, but just to make our
      lives easier with selection incrementing we're going to not do this
- If dropdown is closed
    - L/U decrement SELECTION
    - R/D increment SELECTION
- Dropdown options DO NOT loop from increment/decrement
*/
@Component({
    imports: [CommonModule, AngularSvgIconModule, OverlayModule, PortalModule, PipesModule],
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

    override onOverlayAttach(): void {
        // Timeout for dropdown element to become accessible
        setTimeout(() => {
            this.setOverlayWidth();
            const selectedItem = this.dropdownItems.find(item => item.value === this.selected);
            if (this.selected === undefined || !selectedItem) {
                const first = this.getFirstEnabled();
                if (first) {
                    this.highlightValue$$.set(first.value);
                }
            } else {
                this.highlightValue$$.set(this.selected);
                this.scrollOptionIntoView(selectedItem);
            }
            this.openState$$.set(DropdownState.Open);
        });
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
            const selected = this.dropdownItems.find(item => item.value === this.selected);
            if (selected) {
                this.selectedOptionComponent = selected;
            }
        } else {
            this.selectedOptionComponent = undefined;
        }
    }

    protected setPlaceholderOrDisplayText(): void {
        // If no option is selected, show the placeholder
        if (this.selectedOptionComponent === undefined) {
            this.displayText = of(this.placeholder);
            this.showPlaceholder = true;
        } else {
            this.displayText = this.selectedOptionComponent.getOptionHtml();
            this.showPlaceholder = false;
        }
    }

    private decrementSelect(): void {
        if (
            this.selected === undefined ||
            !this.dropdownItems.find(item => item.value === this.selected)
        ) {
            return;
        }
        const prev = this.getPrevEnabled(this.selected);
        if (prev) {
            this.selectedChange.emit(prev.value);
        }
    }

    private incrementSelect(): void {
        if (
            this.selected === undefined ||
            !this.dropdownItems.find(item => item.value === this.selected)
        ) {
            const first = this.getFirstEnabled();
            if (first) {
                this.selectedChange.emit(first.value);
            }
            return;
        }
        const next = this.getNextEnabled(this.selected);
        if (next) {
            this.selectedChange.emit(next.value);
        }
    }

    private decrementHighlight(): void {
        const current = this.highlightValue$$();
        if (typeof current === 'symbol') {
            return;
        }
        const prev = this.getPrevEnabled(current);
        if (prev) {
            this.highlightValue$$.set(prev.value);
            this.scrollOptionIntoView(prev);
        }
    }

    private incrementHighlight(): void {
        const current = this.highlightValue$$();
        if (typeof current === 'symbol') {
            // If all options are disabled, assign on open doesn't happen
            return;
        }
        const next = this.getNextEnabled(current);
        if (next) {
            this.highlightValue$$.set(next.value);
            this.scrollOptionIntoView(next);
        }
    }

    private decrement(): void {
        if (this.dropdownClosed$$()) {
            this.decrementSelect();
        } else if (this.dropdownOpen$$()) {
            this.decrementHighlight();
        }
    }
    private increment(): void {
        if (this.dropdownClosed$$()) {
            this.incrementSelect();
        } else if (this.dropdownOpen$$()) {
            this.incrementHighlight();
        }
    }

    private selectHighlighted(): void {
        const highlighted = this.highlightValue$$();
        if (typeof highlighted !== 'symbol') {
            this.selectedChange.emit(highlighted);
            this.hideDropdown();
        }
    }

    override onKeyDown(event: KeyboardEvent): void {
        if (this.disabled) {
            if (event.key === 'Tab') {
                return; // Allow tabbing away on disabled after click
            } else {
                event.preventDefault();
                return;
            }
        }

        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                this.decrement();
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                this.increment();
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (this.dropdownOpen$$()) {
                    this.selectHighlighted();
                } else {
                    this.showDropdown();
                }
                break;
            case 'Escape':
                if (this.dropdownOpen$$()) {
                    this.hideDropdown();
                }
                break;
            default:
                break;
        }
    }

    override onBlur(event: FocusEvent): void {
        if (this.disabled) {
            return;
        }
        if (this.dropdownOpening$$()) {
            /* Sometimes there's a delay between the open action and
            the dropdown actually appearing. If the user clicks away after
            activating the dropdown but before it opens, don't show it. */
            this.openState$$.set(DropdownState.AbortingOpen);
        } else if (this.dropdownOpen$$()) {
            this.hideDropdown();
        }
    }
}
