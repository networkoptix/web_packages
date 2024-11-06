import { Component } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

@Component({
    selector: 'nx-page-placeholder-no-access',
    templateUrl: 'failed-partner-access-page-placeholder.component.html',
    styleUrl: 'failed-partner-access-page-placeholder.component.scss',
    standalone: true,
    imports: [NxPagePlaceholderGenericComponent, AngularSvgIconModule, NxAddSvgSrcDirective],
})
export class NxPagePlaceholderFailedPartnerAccessComponent {
    icons = icons;
}
