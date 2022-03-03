import { Injectable } from '@angular/core';
import {
    CanActivate,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    UrlTree,
    Router,
} from '@angular/router';
import { Observable } from 'rxjs';

import { NxAccountService, Account } from '@services/account.service';
import { NxSystemsService, NxSystemWithUserInfo } from '@services/systems.service';

@Injectable({
    providedIn: 'root'
})
export class TwofaGuard implements CanActivate {
    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private systemsService: NxSystemsService,
    ) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        _state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this.accountService.get(true).then((account: Account) => {
            const systemSubscription = this.systemsService.systemsSubject
                .subscribe((systems: NxSystemWithUserInfo[]) => {
                    setTimeout(() => systemSubscription.unsubscribe());
                    const { systemId } = route.params;
                    const system = systems.find(system => system.id === systemId);
                    if (system?.system2faEnabled && !account.totpExistsForAccount) {
                        this.router.navigate(['twofa-required'], {
                            queryParams: { systemName: system.name }
                        });
                    }
                });
            return true;
        });
    }
}
