import { Injectable } from '@angular/core';

import { environment } from '@environments/environment';

import { NxConfigService, IConfig } from './nx-config';
import { NxSystem } from './system.service';

@Injectable({
    providedIn: 'root'
})
export class NxAppSourceService {
    readonly environment = environment;
    private CONFIG: IConfig;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    getMenuBase(system: Partial<NxSystem>) {
        if (this.environment.isLocal) {
            return `${this.CONFIG.menus.systemHealth.baseUrl}`;
        } else {
            return `${this.CONFIG.menus.systemSettings.baseUrl}${system.id}${this.CONFIG.menus.systemHealth.baseUrl}`;
        }
    }

    getMonitoringMenuBase(system: Partial<NxSystem>) {
        if (this.environment.isLocal) {
            return `${this.CONFIG.menus.systemMonitoring.baseUrl}`;
        } else {
            return `${this.CONFIG.menus.systemSettings.baseUrl}${system.id}${this.CONFIG.menus.systemMonitoring.baseUrl}`;
        }
    }
}
