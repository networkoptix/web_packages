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
    if (environment.isLocal || !systemId) {
        return true;
    }

    const account = await firstValueFrom(
        inject(Store)
            .select(selectCurrentUser)
            .pipe(filter(account => account.is_authenticated)),
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
                await router.navigate([`/systems/${systemId}/noAccess/${system.name}`]);
                return true;
            }
        } catch (e) {
            return false;
        }
    }
    return true;
};
