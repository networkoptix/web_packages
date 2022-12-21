import { Component, ViewEncapsulation, Input } from '@angular/core';

import type { DropdownItem } from '../dropdown.component.types';

@Component({
    selector: 'nx-item-icon',
    template: `
        <svg-icon
            *ngIf="item.icon"
            [applyClass]="true"
            class="item-icon"
            [svgStyle]="{
                'width.px': '24',
                'height.px': '24',
                'margin-right.px': '8',
                'margin-left.px': marginLeft
            }"
            nx-add-svg-src
            [src]="item.icon"
        ></svg-icon>
    `,
    encapsulation: ViewEncapsulation.None,
})
export class NxGenericDropdownItemSVG {
    @Input() item: DropdownItem<unknown>;
    @Input() marginLeft: string;
}
