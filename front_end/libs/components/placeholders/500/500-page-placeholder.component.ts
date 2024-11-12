import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { nxConfig } from '@services/nx-config/config';
import type { IConfig } from '@services/nx-config/config-types';
import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

@Component({
    selector: 'nx-page-placeholder-500',
    templateUrl: '500-page-placeholder.component.html',
    styleUrls: ['500-page-placeholder.component.scss'],
    standalone: true,
    imports: [NxPagePlaceholderGenericComponent, AngularSvgIconModule, TranslateModule],
})
export class NxPagePlaceholder500Component {
    icons = icons;
    CONFIG: IConfig = nxConfig;
}
