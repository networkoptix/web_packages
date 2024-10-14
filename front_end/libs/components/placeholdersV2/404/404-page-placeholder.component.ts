import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

@Component({
    selector: 'nx-page-placeholder-404',
    templateUrl: '404-page-placeholder.component.html',
    styleUrl: '404-page-placeholder.component.scss',
    standalone: true,
    imports: [NxPagePlaceholderGenericComponent, AngularSvgIconModule, RouterLink, TranslateModule],
})
export class NxPagePlaceholder404Component {
    icons = icons;
    showButton = input(false);
}
