import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import staticLang from '@language_static';
import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

@Component({
    selector: 'nx-page-placeholder-failed-system-access',
    templateUrl: 'failed-system-access-page-placeholder.component.html',
    styleUrl: 'failed-system-access-page-placeholder.component.scss',
    standalone: true,
    imports: [NxPagePlaceholderGenericComponent, AngularSvgIconModule, TranslateModule, RouterLink],
})
export class NxPagePlaceholderFailedSystemAccessComponent {
    icons = icons;
    LANG = staticLang;
}
