import { Component, input /* input */ } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxPagePlaceholderGenericComponent } from '@components/placeholders/generic-page-placeholder.component';
import staticLang from '@language_static';
import { icons } from '@static-variables';
@Component({
    selector: 'nx-system-no-access-component',
    standalone: true,
    imports: [
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxPagePlaceholderGenericComponent,
    ],
    templateUrl: 'no-access.component.html',
    styleUrls: ['no-access.component.scss'],
})
export class NxSystemNoAccessComponent {
    LANG = staticLang;
    icons = icons;
    systemName$$ = input.required<string>({ alias: 'systemName' });
}
