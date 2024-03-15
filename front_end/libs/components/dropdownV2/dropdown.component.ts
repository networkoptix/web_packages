import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { Component, forwardRef, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { of } from 'rxjs';

import { PipesModule } from '@pipes/pipes.module';

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
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxDropdownComponent),
            multi: true,
        },
    ],
})
export class NxDropdownComponent<T> extends BaseDropdownComponent<T, false> {
    // The selected DropdownItem
    private selectedOptionComponent: BaseDropdownItem<T | undefined> | undefined;

    selected$$ = signal<T | undefined>(undefined);

    handleSelectionChange(): void {
        const updatedSelect = this.selectedOptionComponent?.value;
        this.updateSelected(updatedSelect);
    }

    override handleOptionSelected(option: BaseDropdownItem<T>): void {
        this.hideDropdown();
        super.handleOptionSelected(option);
    }

    override onOverlayAttach(): void {
        // Timeout for dropdown element to become accessible
        setTimeout(() => {
            this.setOverlayWidth();
            const selected = this.selected$$();
            const selectedItem = this.dropdownItems.find(item => item.value === selected);
            if (selected === undefined || !selectedItem) {
                const first = this.getFirstEnabled();
                if (first) {
                    this.highlightValue$$.set(first.value);
                }
            } else {
                this.highlightValue$$.set(selected);
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
        const selected = this.selected$$();
        if (selected !== undefined) {
            // find the dropdownItem that matches the selected value
            const selectedFound = this.dropdownItems.find(item => item.value === selected);
            if (selectedFound) {
                this.selectedOptionComponent = selectedFound;
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
        const selected = this.selected$$();
        if (selected === undefined || !this.dropdownItems.find(item => item.value === selected)) {
            return;
        }
        const prev = this.getPrevEnabled(selected);
        if (prev) {
            this.updateSelected(prev.value);
        }
    }

    private incrementSelect(): void {
        const selected = this.selected$$();
        if (selected === undefined || !this.dropdownItems.find(item => item.value === selected)) {
            const first = this.getFirstEnabled();
            if (first) {
                this.updateSelected(first.value);
            }
            return;
        }
        const next = this.getNextEnabled(selected);
        if (next) {
            this.updateSelected(next.value);
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
            this.updateSelected(highlighted);
            this.hideDropdown();
        }
    }

    override onKeyDown(event: KeyboardEvent): void {
        if (this.disabled()) {
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
        super.onBlur(event);
        if (this.disabled()) {
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
