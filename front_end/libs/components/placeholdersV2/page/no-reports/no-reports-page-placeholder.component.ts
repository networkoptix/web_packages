import { Component } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxThemeAttributeDirective } from '@directives/theme-attribute.directive';
import { icons } from '@static-variables';

import { NxPagePlaceholderGenericNewV2Component } from '../page-placeholder.component';

@Component({
    selector: 'nx-page-placeholder-no-reports',
    templateUrl: 'no-reports-page-placeholder.component.html',
    standalone: true,
    imports: [AngularSvgIconModule, NxPagePlaceholderGenericNewV2Component],
    hostDirectives: [NxThemeAttributeDirective],
})
export class NxPagePlaceholderNoReportsComponent {
    icons = icons;
}
