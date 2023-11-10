import { Component, Input } from '@angular/core';

import { icons } from '@static-variables';

@Component({
    selector: 'nx-open-client-section-placeholder',
    templateUrl: './open-client-section.component.html',
    styleUrls: ['../section/section-placeholder.component.scss'],
})
export class NxOpenClientSectionPlaceholderComponent {
    @Input() wrapperHeightPx: number = 203;
    @Input() svgHeightPx: number = 64;
    @Input() svgWidthPx: number = 64;
    @Input() svgFileName: string = 'system_settings_placeholder';
    @Input() translatedMessage: string;

    icons = icons;
}
