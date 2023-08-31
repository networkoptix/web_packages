import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import * as staticLang from '@language_static';

@Component({
    selector: 'nx-additional-systems-tile',
    templateUrl: 'additional-systems-tile.component.html',
    styleUrls: ['additional-systems-tile.component.scss'],
    imports: [CommonModule, TranslateModule],
    standalone: true,
})
export class NxAdditionalSystemsTileComponent {
    LANG = staticLang;
    @Input() additionalSystems$: BehaviorSubject<number>;
    @Input() width: number = 240;
}
