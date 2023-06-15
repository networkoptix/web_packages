import { Location } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { lastValueFrom, Observable, switchMap, take } from 'rxjs';

import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { OauthService } from '@services/oauth.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { WINDOW } from '@services/window-provider';

@Injectable({
    providedIn: 'root',
})
export class TwofaGuard {
    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private cloudApi: NxCloudApiService,
        private systemsService: NxSystemsService,
        private oauthService: OauthService,
        @Inject(WINDOW) private window: Window,
    ) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this.systemsService.systemsSubject.pipe(
            take(1),
            switchMap(async (systems: NxSystemInfo[]) => {
                const { systemId } = route.params;
                const systemInfo = systems.find(system => system.id === systemId);
                let account: Account = await this.accountService.get();
                if (systemInfo?.system2faEnabled && !account.sessionVerified) {
                    account = await this.accountService.get(true);
                }
                if (systemInfo?.system2faEnabled && !account.sessionVerified) {
                    if (!account.totpExistsForAccount) {
                        const noRedirect = this.window.location.href.endsWith(
                            `twofa-required?systemName=${systemInfo.name}`,
                        );
                        if (!noRedirect) {
                            this.router.navigate(['twofa-required'], {
                                queryParams: { systemName: systemInfo.name },
                            });
                        } else {
                            return false;
                        }
                    } else {
                        const accessToken = await lastValueFrom(this.cloudApi.getAccessToken());
                        this.oauthService.redirectOauth(
                            'system2faAuth',
                            account.email,
                            undefined,
                            accessToken,
                            Location.joinWithSlash(this.window.location.origin, state.url),
                        );
                    }
                } else {
                    return true;
                }
            }),
        );
    }
}
