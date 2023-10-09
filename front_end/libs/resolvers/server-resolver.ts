import { inject } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, ResolveFn, Router } from '@angular/router';

import type { NxSystemServer } from '@services/system.service/system-server-types';
import { NxSystemService } from '@services/system.service/system.service';
import { cleanId } from '@utils/general';

const buildUpdatedPath = (path: string, systemId: string, serverId: string): string =>
    `/systems/${systemId}/${path.replace(':serverId', serverId)}`;

export const serverResolver: ResolveFn<NxSystemServer> = async (route: ActivatedRouteSnapshot) => {
    const activateRoute = inject(ActivatedRoute);
    const router = inject(Router);
    const currentSystem = inject(NxSystemService).getCurrentSystem();

    const { serverId } = route.params;
    const servers = currentSystem.serverManager.servers;
    let server = servers.find(({ id }) => id.includes(serverId));

    if (!server || !serverId) {
        server = servers[0];
        await router.navigate(
            [buildUpdatedPath(route.routeConfig.path, currentSystem.id, cleanId(server.id))],
            {
                relativeTo: activateRoute,
            },
        );
    }
    return server;
};
