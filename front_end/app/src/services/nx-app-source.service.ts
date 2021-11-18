import { Injectable } from '@angular/core';

import { NxConfigService, IConfig } from './nx-config';
import { NxSystem } from './system.service';
import { environment } from '@environments/environment';

@Injectable({
    providedIn: 'root'
})
export class NxAppSourceService {
    environment = environment;
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
}
