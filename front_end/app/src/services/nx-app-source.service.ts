import { Injectable }               from '@angular/core';

import { NxConfigService, IConfig } from './nx-config';
import { NxSystem }                 from './system.service';

@Injectable({
    providedIn: 'root'
})
export class NxAppSourceService {
    private CONFIG: IConfig;

    constructor(configService: NxConfigService) {
        this.CONFIG = configService.getConfig();
    }

    getMenuBase(system: NxSystem) {
        if (this.CONFIG.isLocal) {
            return `${this.CONFIG.menus.systemHealth.baseUrl}`;
        } else {
            return `${this.CONFIG.menus.systemSettings.baseUrl}${system.id}${this.CONFIG.menus.systemHealth.baseUrl}`;
        }
    }
}
