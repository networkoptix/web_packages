import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { System } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { icons } from '@static-variables';

@Component({
    selector: 'nx-system-tile',
    templateUrl: 'system-tile.component.html',
    styleUrls: ['system-tile.component.scss'],
    imports: [CommonModule, AngularSvgIconModule],
    standalone: true,
})
export class NxSystemTileComponent {
    @Input() system: System;
    @Input() active: boolean = false;
    @Input() width: number = 240;

    CONFIG: IConfig;
    constructor(configService: NxConfigService) {
        this.CONFIG = configService.config;
    }

    get icon(): string {
        const icon =
            this.system.stateOfHealth === this.CONFIG.system.status.online
                ? 'system.svg'
                : 'system_offline.svg';
        return icons.dir + icon;
    }
}
