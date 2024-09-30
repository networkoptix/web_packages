import { Component } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

@Component({
    selector: 'nx-page-placeholder-no-access',
    templateUrl: 'no-access-page-placeholder.component.html',
    standalone: true,
    imports: [NxPagePlaceholderGenericComponent, AngularSvgIconModule, NxAddSvgSrcDirective],
})
export class NxPagePlaceholderNoAccessComponent {
    icons = icons;
}
