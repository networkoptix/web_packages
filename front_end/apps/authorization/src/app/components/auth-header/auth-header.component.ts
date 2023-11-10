import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { environment } from '@environments/environment';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-auth-header',
    templateUrl: './auth-header.component.html',
    styleUrls: ['./auth-header.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, AngularSvgIconModule, NxAddSvgSrcDirective],
})
export class AuthHeaderComponent {
    readonly environment = environment;
    readonly icons = icons;
    @Input() viewType: string;
}
