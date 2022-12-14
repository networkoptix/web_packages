import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';

import { environment } from '@environments/environment';
import { NxSessionService } from '@services/session.service';
import { NxSystemInfo } from '@services/systems.service.types';

@Injectable({ providedIn: 'root' })
export class SystemTitleResolver implements Resolve<string> {
    systems: NxSystemInfo[];
    systemId: string;

    constructor(
        sessionService: NxSessionService,
    ) {
        this.systems = sessionService.systems;
        this.systemId = sessionService.systemId;
    }

    resolve(route: ActivatedRouteSnapshot): string {
        if (!environment.isLocal) {
            const id = route.params.systemId || this.systemId;
            const systemName = this.systems?.find((system: NxSystemInfo) => system.id === id)?.name || '';

            return `{"baseTitle" : "${systemName}", "type": "system"}`;
        }
        return '';
    }
}
