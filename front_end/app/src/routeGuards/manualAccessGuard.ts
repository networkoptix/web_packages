import { ActivatedRoute, ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Inject, Injectable } from '@angular/core';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxAppStateService }        from '@services/nx-app-state.service';
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
