import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { icons } from '@static-variables';

@Component({
    selector: 'nx-bind-error-state',
    standalone: true,
    templateUrl: './bind-error-state.component.html',
    styleUrls: ['./bind-error-state.component.scss'],
    imports: [AngularSvgIconModule, TranslateModule],
})
export class BindErrorStateComponent {
    protected readonly icons = icons;
}
