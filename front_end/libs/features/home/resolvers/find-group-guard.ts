import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable, catchError, from, iif, map, switchMap } from 'rxjs';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxSystemsService } from '@services/systems.service';

import { generateRoute } from '../store/route-state/route-state-utils';
import { ChannelPartnersRouteState } from '../store/route-state/route-state.store';

export const FindGroupGuard: CanActivateFn = ({
    params: { systemId },
}: ActivatedRouteSnapshot): boolean | Observable<boolean> => {
    const router = inject(Router);
    const cpApi = inject(NxCloudApiService).cloudChannelPartnersApi;
    const systemInfo = inject(NxSystemsService).systems.find(({ id }) => id === systemId);
    const isUserSystem = systemInfo && !('organization' in systemInfo);

    if (isUserSystem) {
        return from(router.navigate(['/home', systemInfo.isMine ? 'personal' : 'shared'])).pipe(
            map(() => true),
        );
    }

    const lastRoute = inject(ChannelPartnersRouteState).lastRouteFromHistory$$();

    return iif(
        () => !!lastRoute,
        Promise.resolve(lastRoute),
        cpApi.getSystem(systemId).pipe(
            switchMap(async system =>
                generateRoute({
                    groupId: system.groupId || undefined,
                    organizationId: system.organization,
                    tabId: 'systems',
                }),
            ),
            catchError(async () => '/systems'),
        ),
    ).pipe(
        switchMap(async route => {
            await router.navigate([route]);
            return false;
        }),
    );
};
