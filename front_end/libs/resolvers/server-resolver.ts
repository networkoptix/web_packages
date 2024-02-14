import { inject } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';
import { catchError } from 'rxjs';

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

    const systemOffline = 'systemOffline' as const;

    const server = await currentSystem.serverManager
        .getForceServers(false)
        .pipe(catchError(() => Promise.resolve(systemOffline)))
        .toPromise()
        .then(servers => {
            if (servers === systemOffline) {
                return systemOffline;
            }

            if (servers?.length) {
                return servers.find(({ id }) => id.includes(serverId)) || servers[0];
            }
        });

    if (server === systemOffline) {
        // Don't redirect if the system is offline since this was preventing the page from loading
        return;
    }

    if (!server) {
        const path = buildUpdatedPath(
            route.routeConfig.path,
            cleanIdLegacy(currentSystem.id),
            cleanIdLegacy(serverId),
        );

        await router.navigate([path], {
            relativeTo: activateRoute,
        });
    }

    return server;
};
