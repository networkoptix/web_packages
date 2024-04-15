import { Component, ElementRef, ViewChild, forwardRef } from '@angular/core';

import { NxCheckboxComponent } from '../../../checkbox/checkbox.component';
import { BaseSelectV2Item } from '../base-select-item/base-select-item.component';

@Component({
    selector: 'nx-multi-select-item',
    templateUrl: 'multi-select-item.component.html',
    styleUrls: ['multi-select-item.component.scss'],
    providers: [
        {
            provide: BaseSelectV2Item,
            useExisting: forwardRef(() => NxMultiSelectV2ItemComponent),
        },
    ],
    standalone: true,
    imports: [NxCheckboxComponent],
})
export class NxMultiSelectV2ItemComponent<T> extends BaseSelectV2Item<T> {
    @ViewChild('ngContentWrapper') private option: ElementRef<HTMLDivElement>;

    getOptionHtml(): string {
        return this.option.nativeElement.innerHTML;
    }
}
