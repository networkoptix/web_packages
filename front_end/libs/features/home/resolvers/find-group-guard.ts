import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, from, iif, map, Observable, switchMap } from 'rxjs';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxSystemsService } from '@services/systems.service';
import { isUserSystem } from '@utils/nx';

import { generateRoute } from '../store/route-state/route-state-utils';
import { ChannelPartnersRouteState } from '../store/route-state/route-state.store';

export const FindGroupGuard: CanActivateFn = ({
    params: { systemId },
}: ActivatedRouteSnapshot): boolean | Observable<boolean> => {
    const router = inject(Router);
    const cpApi = inject(NxCloudApiService).cloudChannelPartnersApi;
    const systemInfo = inject(NxSystemsService).systems.find(({ id }) => id === systemId);

    if (systemInfo && isUserSystem(systemInfo)) {
        return from(router.navigate(['/home', systemInfo.isMine ? 'personal' : 'shared'])).pipe(
            map(() => true),
        );
    }

    const lastRoute = inject(ChannelPartnersRouteState).lastRouteFromHistory$$();

    return iif(
        () => !!lastRoute,
        Promise.resolve(lastRoute),
        cpApi.getSystem(systemId).pipe(
            switchMap(async system => {
                const org = await firstValueFrom(cpApi.getOrganization(system.organization));
                const partnerAccess = await firstValueFrom(
                    cpApi.getSelfChannelPartnerUser(org.channelPartner),
                ).catch(() => null);
                const partnerId = partnerAccess ? org.channelPartner : undefined;
                return generateRoute({
                    groupId: system.groupId || undefined,
                    organizationId: system.organization,
                    partnerId,
                    tabId: 'systems',
                });
            }),
            catchError(async () => '/systems'),
        ),
    ).pipe(
        switchMap(async route => {
            await router.navigate([route]);
            return false;
        }),
    );
};
