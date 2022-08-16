import { Location } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import {
    CanActivate,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    UrlTree,
    Router,
} from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { take } from 'rxjs/operators';

import { NxAccountService, Account } from '@services/account.service';
import { OauthService } from '@services/oauth.service';
import type { NxSystemRestAPI } from '@services/system-api.service';
import { NxSystemService } from '@services/system.service';
import { NxSystemsService, NxSystemWithUserInfo } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';

@Injectable({
    providedIn: 'root'
})
export class TwofaGuard implements CanActivate {
    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private oauthService: OauthService,
        @Inject(WINDOW) private window: Window,
    ) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        const canActivateSubject = new Subject<boolean>();
        this.accountService.get(true).then((account: Account) => {
            this.systemsService.systemsSubject
                .pipe(take(1))
                .subscribe((systems: NxSystemWithUserInfo[]) => {
                    const { systemId } = route.params;
                    const systemInfo = systems.find(system => system.id === systemId);
                    if (systemInfo?.system2faEnabled && !account.sessionVerified) {
                        if (!account.totpExistsForAccount) {
                            const noRedirect = this.window.location.href.endsWith(
                                `twofa-required?systemName=${systemInfo.name}`
                            );
                            if (!noRedirect) {
                                canActivateSubject.complete();
                                this.router.navigate(
                                    ['twofa-required'],
                                    { queryParams: { systemName: systemInfo.name } }
                                );
                            } else {
                                canActivateSubject.next(false);
                                canActivateSubject.complete();
                            }
                        } else {
                            const system = this.systemService.createSystem(
                                account.email,
                                systemId,
                                undefined,
                                true
                            );
                            canActivateSubject.complete();
                            this.oauthService.redirectOauth(
                                'system2faAuth',
                                account.email,
                                undefined,
                                (system.mediaserver as NxSystemRestAPI).accessToken,
                                Location.joinWithSlash(this.window.location.origin, state.url)
                            );
                        }
                    } else {
                        canActivateSubject.next(true);
                        canActivateSubject.complete();
                    }
                });
        });
        return canActivateSubject;
    }
}
