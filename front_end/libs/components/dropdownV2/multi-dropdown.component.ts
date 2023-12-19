import { Overlay, OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';
import { Component, OnChanges, forwardRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import staticLang from '@language_static';
import { NgChanges } from '@utils/ng-changes';

import { BaseDropdownComponent } from './base-dropdown.component';
import { NxDropdownComponent } from './dropdown.component';
import { BaseDropdownInjectionToken } from './dropdown.types';
import { BaseDropdownItem } from './dropdownItems/baseDropdownItem/dropdown-item.component';

@Component({
    imports: [CommonModule, AngularSvgIconModule, OverlayModule, PortalModule],
    selector: 'nx-multi-dropdown',
    templateUrl: 'dropdown.component.html',
    styleUrls: ['dropdown.component.scss'],
    standalone: true,
    providers: [
        {
            provide: BaseDropdownInjectionToken,
            useExisting: forwardRef(() => NxMultiDropdownComponent),
        },
    ],
})
export class NxMultiDropdownComponent<T>
    extends BaseDropdownComponent<T, true>
    implements OnChanges
{
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

    ngOnChanges(changes: NgChanges<NxDropdownComponent<unknown>>): void {
        if (changes.selected) {
            this.manuallySetSelectedOption();
            this.setPlaceholderOrDisplayText();
        }
    }

    override handleSelectionChange(): void {
        const updatedSelect = this.selectedOptionComponents.map(
            selectedOptionComponent => selectedOptionComponent.value,
        );
        this.selectedChange.emit(updatedSelect);
        this.onChange.emit(updatedSelect);
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
            this.selected.includes(item.value),
        );
    }

    protected setPlaceholderOrDisplayText(): void {
        // If no option is selected, show the placeholder
        if (this.selectedOptionComponents.length === 0) {
            this.displayText = this.domSanitizer.bypassSecurityTrustHtml(this.placeholder);
            this.showPlaceholder = true;
            return;
        }
        // Option has been selected, show the appropriate text
        if (this.selectedOptionComponents.length === 1) {
            this.displayText = this.domSanitizer.bypassSecurityTrustHtml(
                this.selectedOptionComponents[0].getOptionHtml(),
            );
        } else {
            /* This is currently how legacy dropdowns handle multiple selected options
                    There is probably a better way to do this involving getOptionHtml() but it's complicated
                    We can come back to this if a use case shows up where customizable placeholder is needed
                */
            this.displayText = this.translate.instant(this.LANG.search.selected, {
                count: this.selectedOptionComponents.length,
            });
        }
        this.showPlaceholder = false;
    }

    LANG = staticLang;
}
