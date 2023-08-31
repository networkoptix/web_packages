import { Component, Input } from '@angular/core';

import { icons, images } from '@static-variables';

type InputType = 'small' | 'wide' | 'adaptive';
@Component({
    selector: 'nx-landing-content-block',
    templateUrl: './landing-content-block.component.html',
    styleUrls: ['./landing-content-block.component.scss'],
})
export class NxContentLandingBlockComponent {
    @Input() type: InputType;
    @Input() title: string;
    @Input() content: string;
    @Input() svg: string = 'eye_closed';
    @Input() url: string = '';
    @Input() externalLink: boolean = false;

    icons = icons;
    images = images;

    svgSizes = {
        mainSvg: {
            width: '64',
            height: '64',
        },
        arrowLarge: {
            width: '64',
            height: '50',
        },
        arrowSmall: {
            width: '40',
            height: '24',
        },
    };
}
