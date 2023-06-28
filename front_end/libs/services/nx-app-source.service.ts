import { Injectable } from '@angular/core';

import { environment } from '@environments/environment';

import { menus } from '../variables/static-variables';

import type { NxSystem } from './system.service/system';

@Injectable({
    providedIn: 'root',
})
export class NxAppSourceService {
    readonly environment = environment;

    getMenuBase(system: Partial<NxSystem>): string {
        if (this.environment.isLocal) {
            return `${menus.systemHealth.baseUrl}`;
        } else {
            return `${menus.systemSettings.baseUrl}${system.id}${menus.systemHealth.baseUrl}`;
        }
    }

    getMonitoringMenuBase(system: Partial<NxSystem>): string {
        if (this.environment.isLocal) {
            return `${menus.systemMonitoring.baseUrl}`;
        } else {
            return `${menus.systemSettings.baseUrl}${system.id}${menus.systemMonitoring.baseUrl}`;
        }
    }
}
