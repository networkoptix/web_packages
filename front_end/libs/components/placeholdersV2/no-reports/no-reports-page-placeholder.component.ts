import { Component } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';
import { icons } from '@static-variables';

import { NxPagePlaceholderGenericComponent } from '../generic-page-placeholder.component';

@Component({
    selector: 'nx-page-placeholder-no-reports',
    templateUrl: 'no-reports-page-placeholder.component.html',
    standalone: true,
    imports: [AngularSvgIconModule, NxPagePlaceholderGenericComponent],
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxPagePlaceholderNoReportsComponent {
    icons = icons;
}
