import { Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate,
    RouterStateSnapshot,
    UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';

import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@Injectable()
export class AuthGuard implements CanActivate {
    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        private accountService: NxAccountService
    ) {
        this.CONFIG = configService.getConfig();
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        // All route to pass account service will handle auth login.
        if (this.CONFIG.newSystem) {
            return false;
        }

        if (state.root.queryParams.auth || state.root.queryParams.code) {
            return true;
        }

        // check if requested in iFrame
        if (window.location !== window.parent.location) {
            return false;
        }

        return this.accountService
            .requireLogin()
            .then(account => {
                return account !== undefined;
            });
    }
}
