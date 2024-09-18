import { Location } from '@angular/common';
import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { lastValueFrom, Observable, switchMap, take } from 'rxjs';

import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { OauthService } from '@services/oauth.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { WINDOW } from '@services/window-provider';

export const TwofaGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Observable<boolean> | boolean => {
    const systemsService: NxSystemsService = inject(NxSystemsService);
    const accountService: NxAccountService = inject(NxAccountService);
    const router: Router = inject(Router);
    const cloudApi: NxCloudApiService = inject(NxCloudApiService);
    const oauthService: OauthService = inject(OauthService);
    const iWindow: Window = inject(WINDOW);
    return systemsService.systemsSubject.pipe(
        take(1),
        switchMap(async (systems: NxSystemInfo[]) => {
            const { systemId } = route.params;
            const systemInfo = systems.find(system => system.id === systemId);
            let account: Account = await accountService.get();
            if (systemInfo?.system2faEnabled && !account.sessionVerified) {
                account = await accountService.get(true);
            }
            if (systemInfo?.system2faEnabled && !account.sessionVerified) {
                if (!account.totpExistsForAccount) {
                    const noRedirect = iWindow.location.href.endsWith(
                        `twofa-required?systemName=${systemInfo.name}`,
                    );
                    if (!noRedirect) {
                        router.navigate(['twofa-required'], {
                            queryParams: { systemName: systemInfo.name },
                        });
                    } else {
                        return false;
                    }
                } else {
                    const accessToken = await lastValueFrom(cloudApi.getAccessToken());
                    oauthService.redirectOauth({
                        state: 'system2faAuth',
                        email: account.email,
                        accessToken,
                        redirectTo: Location.joinWithSlash(iWindow.location.origin, state.url),
                    });
                }
            } else {
                return true;
            }
        }),
    );
};
