import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';

import { BaseDropdown } from '../injDropdown';

import type { ActionItems } from './three-dot.component.types';

/* Usage
 <nx-select
     [componentId]="'COMP_ID'"
     [items]="ActionItems[]"
 </nx-select>
 */

@Component({
    selector: 'nx-three-dot',
    templateUrl: 'three-dot.component.html',
    styleUrls: ['three-dot.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxThreeDotDropdown),
            multi: true,
        },
    ],
    imports: [CommonModule, NxClickElsewhereDirective],
    standalone: true,
})
export class NxThreeDotDropdown extends BaseDropdown {
    @Input() items: ActionItems[];
    @Input() name: string;
    @Input() componentId: string = 'three-dot-menu';

    constructor() {
        super();
    }

    handleShow(event: MouseEvent): void {
        event.stopPropagation();
        this.show = !this.show;
    }

    change(item: ActionItems, event: MouseEvent): void {
        event.stopPropagation();
        item.action();
    }
}
