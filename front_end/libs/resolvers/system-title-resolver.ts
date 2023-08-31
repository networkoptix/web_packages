import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';

import { environment } from '@environments/environment';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';

export const SystemTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) => {
    const systemsService = inject(NxSystemsService);
    if (!environment.isLocal) {
        const systemName =
            systemsService.systems.find(
                (system: NxSystemInfo) => system.id === route.params.systemId,
            )?.name || '';

        return `{"baseTitle" : "${systemName}", "type": "system"}`;
    }
    return '';
};
