import { Component } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

@Component({
    selector: 'nx-nothing-found-placeholder',
    templateUrl: 'nothing-found-placeholder.component.html',
    standalone: true,
    imports: [NxPagePlaceholderGenericComponent, AngularSvgIconModule],
})
export class NxPagePlaceholderNothingFoundComponent {
    icons = icons;
}
