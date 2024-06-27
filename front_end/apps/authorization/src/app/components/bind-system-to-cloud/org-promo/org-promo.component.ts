import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-org-promo',
    templateUrl: './org-promo.component.html',
    styleUrls: ['./org-promo.component.scss'],
    standalone: true,
    imports: [TranslateModule, AngularSvgIconModule, NxAddSvgSrcDirective],
})
export class OrgPromoComponent {
    protected readonly icons = icons;
}
