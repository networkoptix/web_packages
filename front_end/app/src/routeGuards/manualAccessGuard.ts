import { CanActivate, Router }      from '@angular/router';
import { Injectable }               from '@angular/core';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxAppStateService }        from '@services/nx-app-state.service';

@Injectable()
export class ManualAccessGuard implements CanActivate {
    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private appStateService: NxAppStateService
    ) {
        this.CONFIG = configService.getConfig();
    }

    canActivate(): boolean {
        if (!this.appStateService.canManuallyAccess) {
            this.router.navigate([this.CONFIG.redirect.unauthorised]);
        }
        return this.appStateService.canManuallyAccess;
    }
}
