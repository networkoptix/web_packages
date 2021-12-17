import { Component, Input } from '@angular/core';

import { IConfig, NxConfigService } from '@services/nx-config';

type InputType = 'small' | 'wide' | 'adaptive'
@Component({
    selector: 'nx-landing-content-block',
    templateUrl: './landing-content-block.component.html',
    styleUrls: ['./landing-content-block.component.scss']
})
export class NxContentLandingBlockComponent {
    CONFIG: IConfig

    @Input() type: InputType
    @Input() title: string
    @Input() content: string
    @Input() svg = 'eye_closed';
    @Input() url = '';
    @Input() externalLink = false;

    svgSizes = {
        mainSvg: {
            width: '64',
            height: '64'
        },
        arrowLarge: {
            width: '64',
            height: '50'
        },
        arrowSmall: {
            width: '40',
            height: '24'
        }
    }

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }
}
