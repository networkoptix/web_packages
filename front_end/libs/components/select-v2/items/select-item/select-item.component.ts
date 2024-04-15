import { Component, ElementRef, ViewChild, forwardRef } from '@angular/core';

import { BaseSelectV2Item } from '../base-select-item/base-select-item.component';

@Component({
    selector: 'nx-select-item',
    templateUrl: 'select-item.component.html',
    styleUrls: ['select-item.component.scss'],
    providers: [
        { provide: BaseSelectV2Item, useExisting: forwardRef(() => NxSelectV2ItemComponent) },
    ],
    standalone: true,
})
export class NxSelectV2ItemComponent<T> extends BaseSelectV2Item<T> {
    @ViewChild('option') private option: ElementRef<HTMLDivElement>;

    getOptionHtml(): string {
        return this.option.nativeElement.innerHTML;
    }
}
