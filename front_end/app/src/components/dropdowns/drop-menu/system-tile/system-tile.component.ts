import { Component, Input } from '@angular/core';

import { System } from '@services/nx-cloud-api.types';
import { NxConfigService, IConfig } from '@services/nx-config';

@Component({
    selector: 'nx-system-tile',
    templateUrl: 'system-tile.component.html',
    styleUrls: ['system-tile.component.scss']
})
export class NxSystemTileComponent {
    @Input() system: System;
    @Input() active = false;
    @Input() width = 240;

    CONFIG: IConfig;
    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }

    get icon() {
        const icon =
            this.system.stateOfHealth === this.CONFIG.system.status.online
                ? 'system.svg'
                : 'system_offline.svg';
        return this.CONFIG.icons.dir + icon;
    }
}
