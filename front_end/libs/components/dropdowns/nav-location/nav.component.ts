import { Component, Input } from '@angular/core';

import { NxConfigService } from '@services/nx-config/nx-config.service';

import { BaseDropdown } from '../injDropdown';

@Component({
    selector: 'nx-nav-location',
    templateUrl: 'nav.component.html',
    styleUrls: ['nav.component.scss']
})

export class NxNavLocationDropdown extends BaseDropdown {
    @Input() location: any = {};

    constructor(

        configService: NxConfigService
    ) {
        super(configService);
    }

    hide() {
        this.show = false;
        return false;
    }
}
