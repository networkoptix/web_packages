import { Injectable } from '@angular/core';
import {
    CanActivate,
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';

import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@Injectable()
export class RedirectGuard implements CanActivate {
    CONFIG: IConfig;
    constructor(
        config: NxConfigService,
        private router: Router,
        private accountService: NxAccountService,
        private cookieService: CookieService,
    ) {
        this.CONFIG = config.config;
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this.accountService.get().then((account: Account) => {
            // eslint-disable-next-line camelcase
            if (account?.is_authenticated) {
                this.router.navigate([
                    this.CONFIG.featureFlags.dashboardRedirect ||
                    this.cookieService.get('devServer')
                        ? 'dashboard'
                        : 'systems',
                ]);
            } else {
                return true;
            }
        });
    }
}
