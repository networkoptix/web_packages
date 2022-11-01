import { Injectable } from '@angular/core';

import { environment } from '@environments/environment';

import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import type { NxSystem } from './system.service/system';

@Injectable({
    providedIn: 'root'
})
export class NxAppSourceService {
    readonly environment = environment;
    private CONFIG: IConfig;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    getMenuBase(system: Partial<NxSystem>): string {
        if (this.environment.isLocal) {
            return `${this.CONFIG.menus.systemHealth.baseUrl}`;
        } else {
            return `${this.CONFIG.menus.systemSettings.baseUrl}${system.id}${this.CONFIG.menus.systemHealth.baseUrl}`;
        }
    }

    getMonitoringMenuBase(system: Partial<NxSystem>): string {
        if (this.environment.isLocal) {
            return `${this.CONFIG.menus.systemMonitoring.baseUrl}`;
        } else {
            return `${this.CONFIG.menus.systemSettings.baseUrl}${system.id}${this.CONFIG.menus.systemMonitoring.baseUrl}`;
        }
    }
}
