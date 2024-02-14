import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    Router,
    RouterStateSnapshot,
    CanActivateFn,
} from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { nxConfig } from '@services/nx-config/config';

export const TabGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Promise<boolean> | boolean => {
    const cookieService: CookieService = inject(CookieService);
    const router: Router = inject(Router);

    return inject(NxAccountService)
        .get()
        .then((account: Account) => {
            if (account?.is_authenticated) {
                router.navigate([
                    nxConfig.featureFlags.dashboardRedirect || cookieService.get('devServer')
                        ? 'dashboard'
                        : 'systems',
                ]);
            } else {
                return true;
            }
        });
};
