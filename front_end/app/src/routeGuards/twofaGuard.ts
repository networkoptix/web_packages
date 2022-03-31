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
import { NxSystemsService, NxSystemWithUserInfo } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';

@Injectable({
    providedIn: 'root'
})
export class TwofaGuard implements CanActivate {
    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private systemsService: NxSystemsService,
        @Inject(WINDOW) private window: Window,
    ) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        _state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        const canActivateSubject = new Subject<boolean>();
        this.accountService.get(true).then((account: Account) => {
            this.systemsService.systemsSubject
                .pipe(take(1))
                .subscribe((systems: NxSystemWithUserInfo[]) => {
                    const { systemId } = route.params;
                    const system = systems.find(system => system.id === systemId);
                    if (system?.system2faEnabled && !account.totpExistsForAccount) {
                        const noRedirect = this.window.location.href.endsWith(
                            `twofa-required?systemName=${system.name}`
                        );
                        if (!noRedirect) {
                            canActivateSubject.complete();
                            this.router.navigate(
                                ['twofa-required'],
                                { queryParams: { systemName: system.name } }
                            );
                        } else {
                            canActivateSubject.next(false);
                            canActivateSubject.complete();
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
