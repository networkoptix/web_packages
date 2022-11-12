import { Inject, Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate,
    Router,
    RouterStateSnapshot
} from '@angular/router';

import { NxAppStateService } from '@services/nx-app-state.service';
import { WINDOW } from '@services/window-provider';

import { redirect } from '../variables/static-variables';

@Injectable()
export class ManualAccessGuard implements CanActivate {
    constructor(
        @Inject(WINDOW) private window: Window,
        private router: Router,
        private appStateService: NxAppStateService
    ) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> | boolean {
        if (state.url.includes('/activate/') || state.url.includes('/restore_password/')) {
            return this.router.navigateByUrl(`/authorize${state.url}`).then(() => {
                this.window.location.reload();
                return false;
            });
        }
        if (!this.appStateService.canManuallyAccess) {
            return this.router.navigate([redirect.unauthorised]);
        }
        return this.appStateService.canManuallyAccess;
    }
}
