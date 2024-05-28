import { Component } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

import { NxPagePlaceholderGenericNewV2Component } from '../page-placeholder.component';

@Component({
    selector: 'nx-page-placeholder-no-access',
    templateUrl: 'page-placeholder.component.html',
    standalone: true,
    imports: [NxPagePlaceholderGenericNewV2Component, AngularSvgIconModule, NxAddSvgSrcDirective],
})
export class NxPagePlaceholderNoAccessComponent {
    icons = icons;
}
