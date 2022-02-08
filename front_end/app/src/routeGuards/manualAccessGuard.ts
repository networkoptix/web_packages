import { Inject, Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate,
    Router,
    RouterStateSnapshot
} from '@angular/router';

import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { WINDOW } from '@services/window-provider';

@Injectable()
export class ManualAccessGuard implements CanActivate {
    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        @Inject(WINDOW) private window: Window,
        private router: Router,
        private appStateService: NxAppStateService
    ) {
        this.CONFIG = configService.getConfig();
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> | boolean {
        if (state.url.includes('/activate/') || state.url.includes('/restore_password/')) {
            return this.router.navigateByUrl(`/authorize${state.url}`).then(() => {
                this.window.location.reload();
                return false;
            });
        }
        if (!this.appStateService.canManuallyAccess) {
            return this.router.navigate([this.CONFIG.redirect.unauthorised]);
        }
        return this.appStateService.canManuallyAccess;
    }
}
