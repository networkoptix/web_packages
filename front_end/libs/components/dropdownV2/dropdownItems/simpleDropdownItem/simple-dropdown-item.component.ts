import { Component, ElementRef, ViewChild, forwardRef } from '@angular/core';

import { BaseDropdownItem } from '../baseDropdownItem/dropdown-item.component';

@Component({
    selector: 'nx-simple-dropdown-item',
    templateUrl: 'simple-dropdown-item.component.html',
    styleUrls: ['simple-dropdown-item.component.scss'],
    providers: [
        { provide: BaseDropdownItem, useExisting: forwardRef(() => NxSimpleDropdownItemComponent) },
    ],
    standalone: true,
})
export class NxSimpleDropdownItemComponent<T> extends BaseDropdownItem<T> {
    @ViewChild('option') private option: ElementRef<HTMLDivElement>;

    getOptionHtml(): string {
        return this.option.nativeElement.innerHTML;
    }
}
