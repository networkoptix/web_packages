import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

@Component({
    selector: 'nx-page-placeholder-offline',
    templateUrl: 'offline-page-placeholder.component.html',
    styleUrl: 'offline-page-placeholder.component.scss',
    standalone: true,
    imports: [AngularSvgIconModule, TranslateModule, NxPagePlaceholderGenericComponent],
})
export class NxPagePlaceholderOfflineComponent {
    icons = icons;
}
