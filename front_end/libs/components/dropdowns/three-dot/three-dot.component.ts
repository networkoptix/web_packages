import {
    Component,
    ViewEncapsulation,
    Input,
    forwardRef
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { NxConfigService } from '@services/nx-config/nx-config.service';

import { BaseDropdown } from '../injDropdown';

import type { ActionItems } from './three-dot.component.types';

/* Usage
 <nx-select
     [items]="ActionItems[]"
 </nx-select>
 */

@Component({
    selector: 'nx-three-dot',
    templateUrl: 'three-dot.component.html',
    styleUrls: ['three-dot.component.scss'],
    encapsulation: ViewEncapsulation.None,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            useExisting: forwardRef(() => NxThreeDotDropdown),
            multi: true
        }
    ]
})
export class NxThreeDotDropdown extends BaseDropdown {
    @Input() items: ActionItems[];
    @Input() name: string;
    @Input() componentId: string = 'three-dot-menu';

    constructor(
        configService: NxConfigService
    ) {
        super(configService);
    }

    change(item: ActionItems): void {
        item.action();
    }
}
