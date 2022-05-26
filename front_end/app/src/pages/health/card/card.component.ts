import { Component, Input } from '@angular/core';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
// TODO: need to style component

@Component({
    selector: 'nx-system-alert-card-component',
    templateUrl: 'card.component.html',
    styleUrls: ['card.component.scss']
})
export class NxSystemAlertCardComponent {
    @Input() data;
    CONFIG: IConfig;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }
}
