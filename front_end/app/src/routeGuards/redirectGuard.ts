import { Injectable } from '@angular/core';
import {
    CanActivate,
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';

import { NxAccountService, Account } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@Injectable()
export class RedirectGuard implements CanActivate {
    CONFIG: IConfig;
    constructor(
        config: NxConfigService,
        private router: Router,
        private accountService: NxAccountService
    ) {
        this.CONFIG = config.config;
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this.accountService.get().then((account: Account) => {
            // eslint-disable-next-line camelcase
            if (account?.is_authenticated) {
                this.router.navigate([this.CONFIG.featureFlags.dashboardRedirect ? 'dashboard' : 'systems']);
            } else {
                return true;
            }
        });
    }
}
