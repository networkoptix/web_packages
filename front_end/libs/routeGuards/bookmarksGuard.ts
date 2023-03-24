import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import type {
    ActivatedRouteSnapshot,
    CanActivate,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import type { Observable } from 'rxjs';

import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemService } from '@services/system.service/system.service';

import { redirect } from '../variables/static-variables';

@Injectable()
export class BookmarksGuard implements CanActivate {
    CONFIG: IConfig;

    constructor(
        public configService: NxConfigService,
        private router: Router,
        private systemService: NxSystemService,
        private accountService: NxAccountService,
        private deviceService: DeviceDetectorService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        const system =
            this.systemService.getCurrentSystem() ??
            this.systemService.createSystem(this.accountService.email, route.params.systemId);

        const usersPromise = system.userManager.currentUser
            ? Promise.resolve()
            : system.userManager.getUsersDataFromTheSystem();

        return usersPromise.then(() => {
            // https://networkoptix.atlassian.net/wiki/spaces/FS/pages/2786951363/Bookmarks+on+Cloud#User-Permissions-new
            // This condition should be kept in sync with the node add condition
            // for header in menus.service.ts
            if (
                this.configService.flagsEnabled('bookmarks') &&
                system.userManager.currentUser.accessRole !== 'Live Viewer' &&
                !this.deviceService.isMobile()
            ) {
                return true;
            } else {
                this.router.navigate([redirect.page404]);
                return false;
            }
        });
    }
}
