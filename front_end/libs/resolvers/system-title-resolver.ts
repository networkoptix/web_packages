import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';

import { environment } from '@environments/environment';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';

@Injectable({ providedIn: 'root' })
export class SystemTitleResolver implements Resolve<string> {
    systems: NxSystemInfo[];
    systemId: string;

    constructor(private systemsService: NxSystemsService) {}

    resolve(route: ActivatedRouteSnapshot): string {
        if (!environment.isLocal) {
            const id = route.params.systemId || this.systemId;
            const systemName =
                this.systemsService.systems.find((system: NxSystemInfo) => system.id === id)
                    ?.name || '';

            return `{"baseTitle" : "${systemName}", "type": "system"}`;
        }
        return '';
    }
}
