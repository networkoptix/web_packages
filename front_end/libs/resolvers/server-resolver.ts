import { inject } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';

import { environment } from '@environments/environment';
import { NxSystemService } from '@services/system.service/system.service';
import type { NxSystemServer } from '@services/system.service/types/servers.types';
import { cleanIdLegacy } from '@utils/general';

const buildUpdatedPath = (path: string, systemId: string, serverId: string): string => {
    let base = `/systems/${systemId}`;
    if (environment.isLocal) {
        base = '/settings';
    }
    return `${base}/${path.replace(':serverId', serverId)}`;
};

export const serverResolver: ResolveFn<NxSystemServer | undefined> = async (
    route: ActivatedRouteSnapshot,
) => {
    const activateRoute = inject(ActivatedRoute);
    const router = inject(Router);
    const currentSystem = inject(NxSystemService).getCurrentSystem();

    const { serverId } = route.params;

    const server = await currentSystem.serverManager
        .getForceServers(false)
        .toPromise()
        .then(servers => {
            if (servers?.length) {
                return servers.find(({ id }) => id.includes(serverId)) || servers[0];
            }
        });

    if (!server) {
        const path = buildUpdatedPath(
            route.routeConfig.path,
            cleanIdLegacy(currentSystem.id),
            cleanIdLegacy(serverId),
        );

        await router.navigate([path], {
            relativeTo: activateRoute,
        });
    } else {
        return server;
    }
};
