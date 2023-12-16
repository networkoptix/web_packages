import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxVmsClientTextComponent } from '@components/open-vms-client/vms-client-text/vms-client-text.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-open-client-section-placeholder',
    templateUrl: './open-client-section.component.html',
    styleUrls: ['../section/section-placeholder.component.scss'],
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule, NxAddSvgSrcDirective, NxVmsClientTextComponent],
})
export class NxOpenClientSectionPlaceholderComponent {
    @Input() wrapperHeightPx: number = 203;
    @Input() svgHeightPx: number = 64;
    @Input() svgWidthPx: number = 64;
    @Input() svgFileName: string = 'system_settings_placeholder';
    @Input() translatedMessage: string;

    icons = icons;
}
