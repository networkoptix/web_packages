import { Component, ElementRef, ViewChild, forwardRef } from '@angular/core';

import { NxCheckboxComponent } from '../../../checkbox/checkbox.component';
import { BaseDropdownItem } from '../baseDropdownItem/dropdown-item.component';

@Component({
    selector: 'nx-multi-select-dropdown-item',
    templateUrl: 'multi-select-dropdown-item.component.html',
    styleUrls: ['multi-select-dropdown-item.component.scss'],
    providers: [
        {
            provide: BaseDropdownItem,
            useExisting: forwardRef(() => NxMultiSelectDropdownItemComponent),
        },
    ],
    standalone: true,
    imports: [NxCheckboxComponent],
})
export class NxMultiSelectDropdownItemComponent<T> extends BaseDropdownItem<T> {
    @ViewChild('ngContentWrapper') private option: ElementRef<HTMLDivElement>;

    getOptionHtml(): string {
        return this.option.nativeElement.innerHTML;
    }
}
