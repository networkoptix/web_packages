import { Component, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import * as staticLang from '@common/language/language_i18n_static.json';

@Component({
    selector: 'nx-additional-systems-tile',
    templateUrl: 'additional-systems-tile.component.html',
    styleUrls: ['additional-systems-tile.component.scss']
})
export class NxAdditionalSystemsTileComponent {
    LANG = staticLang;
    @Input() additionalSystems$: BehaviorSubject<number>;
    @Input() width: number = 240;
}
