import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import staticLang from '@language_static';
import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

@Component({
    selector: 'nx-page-placeholder-no-settings',
    templateUrl: 'no-settings-page-placeholder.component.html',
    styleUrls: ['no-settings-page-placeholder.component.scss'],
    standalone: true,
    imports: [NxPagePlaceholderGenericComponent, AngularSvgIconModule, TranslateModule],
})
export class NxPagePlaceholderNoSettingsComponent {
    LANG = staticLang;
    icons = icons;
}
