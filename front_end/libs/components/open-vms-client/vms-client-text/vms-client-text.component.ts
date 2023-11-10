import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { icons } from '@static-variables';

import { NxOpenVmsClientBase } from '../open-vms-client-base';
@Component({
    selector: 'nx-vms-client-text',
    templateUrl: 'vms-client-text.component.html',
    styleUrls: ['vms-client-text.component.scss'],
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule, TranslateModule],
})
export class NxVmsClientTextComponent extends NxOpenVmsClientBase {
    icons = icons;
}
