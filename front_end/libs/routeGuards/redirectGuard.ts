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
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

export const TabGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Promise<boolean> | boolean => {
    const CONFIG: IConfig = inject(NxConfigService).getConfig();
    const cookieService: CookieService = inject(CookieService);
    const router: Router = inject(Router);

    return inject(NxAccountService)
        .get()
        .then((account: Account) => {
            // eslint-disable-next-line camelcase
            if (account?.is_authenticated) {
                router.navigate([
                    CONFIG.featureFlags.dashboardRedirect || cookieService.get('devServer')
                        ? 'dashboard'
                        : 'systems',
                ]);
            } else {
                return true;
            }
        });
};
