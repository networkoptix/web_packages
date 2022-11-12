import { Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate,
    Router,
    RouterStateSnapshot,
    UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { redirect } from '../variables/static-variables';

@Injectable()
export class DevelopersGuard implements CanActivate {
    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        private router: Router
    ) {
        this.CONFIG = configService.getConfig();
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        if (this.CONFIG.cloudCapabilities.developersEnabled) {
            return true;
        } else {
            this.router.navigate([redirect.page404]);
            return false;
        }
    }
}
