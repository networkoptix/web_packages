import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { redirect } from '../variables/static-variables';

export const DevelopersGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean => {
    const CONFIG: IConfig = inject(NxConfigService).getConfig();
    const router: Router = inject(Router);
    if (CONFIG.cloudCapabilities.developersEnabled) {
        return true;
    } else {
        router.navigate([redirect.page404]);
        return false;
    }
};
