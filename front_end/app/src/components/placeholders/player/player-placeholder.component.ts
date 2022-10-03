import { Component, Input, OnInit } from '@angular/core';

import { NxConfigService, IConfig } from '@services/nx-config';

/* Usage
 <nx-player-placeholder
     svgFileName='filename minus the .svg'
     height?='#' // desired height (in px) of icon
     heading?='{{ LANG.whateverYouWantFromHere }}'>
     description?='{{ LANG.whateverYouWantFromHere }}'>
 </nx-player-placeholder>
 */

@Component({
    selector: 'nx-player-placeholder',
    templateUrl: 'player-placeholder.component.html',
    styleUrls: ['player-placeholder.component.scss']
})
export class NxPlayerPlaceholderComponent implements OnInit {
    @Input() svgFileName: string;
    @Input() height: string;
    @Input() heading: any;
    @Input() description: any;

    CONFIG: IConfig;
    isUrl: boolean;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    ngOnInit() {
        this.height = this.height || '96';
        this.isUrl = !this.description.includes(' ');
    }
}
