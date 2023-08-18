import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';

import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

export const AuthGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Promise<boolean> | boolean => {
    // All route to pass account service will handle auth login.
    const CONFIG: IConfig = inject(NxConfigService).getConfig();
    const iWindow: Window = inject(WINDOW);

    if (CONFIG.newSystem) {
        return false;
    }

    if (state.root.queryParams.auth || state.root.queryParams.code) {
        return true;
    }

    // check if requested in iFrame
    if (iWindow.location !== iWindow.parent.location) {
        return false;
    }

    return inject(NxAccountService)
        .requireLogin()
        .then(account => {
            return account !== undefined;
        });
};
