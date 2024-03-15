import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { Component, forwardRef, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { of } from 'rxjs';

import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';

import { BaseDropdownComponent } from './base-dropdown.component';
import { BaseDropdownInjectionToken } from './dropdown.types';
import { BaseDropdownItem } from './dropdownItems/baseDropdownItem/dropdown-item.component';

@Component({
    imports: [CommonModule, AngularSvgIconModule, OverlayModule, PortalModule, PipesModule],
    selector: 'nx-multi-dropdown',
    templateUrl: 'dropdown.component.html',
    styleUrls: ['dropdown.component.scss'],
    standalone: true,
    providers: [
        {
            provide: BaseDropdownInjectionToken,
            useExisting: forwardRef(() => NxMultiDropdownComponent),
        },
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxMultiDropdownComponent),
            multi: true,
        },
    ],
})
export class NxMultiDropdownComponent<T> extends BaseDropdownComponent<T, true> {
    override ariaMultiselectable = true;
    selected$$ = signal<T[]>([]);

    constructor(
        overlay: Overlay,
        domSanitizer: DomSanitizer,
        private translate: TranslateService,
    ) {
        super(overlay, domSanitizer);
    }

    // A store of the dropdownItems that are selected
    // This could be a computed signal when signal inputs are ready (performance test needed)
    private selectedOptionComponents: BaseDropdownItem<T>[] = [];

    override handleSelectionChange(): void {
        const updatedSelect = this.selectedOptionComponents.map(
            selectedOptionComponent => selectedOptionComponent.value,
        );
        this.updateSelected(updatedSelect);
    }

    protected updateSelectedOptionComponent(option: BaseDropdownItem<T>): void {
        const index = this.selectedOptionComponents.findIndex(
            selectedOption => selectedOption === option,
        );
        if (index === -1) {
            // If the option is not already selected, add it to the selected options
            this.selectedOptionComponents.push(option);
        } else {
            // If the option is already selected, remove it from the selected options
            this.selectedOptionComponents.splice(index, 1);
        }
    }

    // Called when the selected value is set or changed outside of this component
    protected manuallySetSelectedOption(): void {
        // Compare the 2 arrays (selected and dropdownItems) and set the selectedOptionsComponent array
        this.selectedOptionComponents = this.dropdownItems.filter(item =>
            // Because of an Angular issue selected will be `null` for short period after the construction phase https://github.com/angular/angular/issues/14988
            this.selected$$()?.includes(item.value),
        );
    }

    protected setPlaceholderOrDisplayText(): void {
        // If no option is selected, show the placeholder
        if (this.selectedOptionComponents.length === 0) {
            this.displayText = of(this.placeholder);
            this.showPlaceholder = true;
            return;
        }
        // Option has been selected, show the appropriate text
        if (this.selectedOptionComponents.length === 1) {
            this.displayText = this.selectedOptionComponents[0].getOptionHtml();
        } else {
            /* This is currently how legacy dropdowns handle multiple selected options
                    There is probably a better way to do this involving getOptionHtml() but it's complicated
                    We can come back to this if a use case shows up where customizable placeholder is needed
                */
            this.displayText = of(
                this.translate.instant(this.LANG.search.selected, {
                    count: this.selectedOptionComponents.length,
                }),
            );
        }
        this.showPlaceholder = false;
    }

    LANG = staticLang;

    // TODO: Add keyboard navigation
    override onKeyDown(event: KeyboardEvent): void {}
    override onBlur(event: FocusEvent): void {
        super.onBlur(event);
    }
}
