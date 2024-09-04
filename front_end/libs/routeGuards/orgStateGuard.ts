import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, firstValueFrom, map } from 'rxjs';

import { environment } from '@environments/environment';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { selectCurrentUser } from '@store/account/account.selectors';
import { isUserSystem } from '@utils/nx';

export const OrgStateGuard: CanActivateFn = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Promise<boolean> => {
    const router = inject(Router);
    const cloudApiService = inject(NxCloudApiService);
    const systemService = inject(NxSystemsService);
    const systemId = route.params.systemId;
    if (environment.isLocal || !nxConfig.featureFlags.channelPartners || !systemId) {
        return true;
    }

    const account = await firstValueFrom(
        inject(Store)
            .select(selectCurrentUser)
            .pipe(filter(account => account?.is_authenticated)),
    );
    if (!account) {
        return false;
    }
    let systemInfo: NxSystemInfo | undefined;
    try {
        systemInfo = await firstValueFrom(
            systemService.systemsSubject.pipe(
                map(systems => systems.find(system => system.id === systemId)),
            ),
        );
    } catch {
        return true;
    }

    if (!systemInfo) {
        return true;
    }

    if (!isUserSystem(systemInfo)) {
        try {
            const system = await firstValueFrom(
                cloudApiService.cloudChannelPartnersApi.getSystem(systemId),
            );
            if (
                ['suspended', 'shutdown'].includes(system.effectiveState) &&
                !route.queryParams.orgState
            ) {
                await router.navigate([`/systems/${systemId}/no-access/${system.name}`]);
                return true;
            }
        } catch (e) {
            // Something is wrong with channel partners or user blocked domain in dev tools.
            // 0 for dev tools
            // Everything else for legitimate issues in the partner service.
            return [0, 500, 502, 503, 504].includes(e?.status ?? -1);
        }
    }
    return true;
};
