import {
    Component,
    ViewEncapsulation,
    Input,
    forwardRef
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { BaseDropdown } from '../injDropdown';

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
            useExisting: forwardRef(() => NxThreeDotDropdown),
            multi: true
        }
    ]
})

export class NxThreeDotDropdown extends BaseDropdown {
    @Input() items: ActionItems[];
    @Input() name: string;
    @Input() componentId: string = 'three-dot-menu'

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        super(languageService, configService);
    }

    change(item) {
        item.action();
    }
}

export class ActionItems {
    constructor(
        public action: () => void,
        public name?: string,
        public id?: string
    ) {}
}
