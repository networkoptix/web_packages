import { Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';

@Injectable()
export class SystemGuard implements CanActivate {
    public loading = false;

    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private settingsService: NxSettingsService,
        private menusService: NxMenusService,
        private configService: NxConfigService,
        private deviceService: DeviceDetectorService,
    ) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        if (!environment.isLocal && state.url === '/health-report') {
            // navigate to report viewer if viewing /health route
            return this.router.navigate(['/health-report/viewer']);
        }
        if (state.url.startsWith('/health-report')) {
            return true;
        }

        const routesChecked = [
            'users',
            'cloud-storage',
            'health',
            'licenses',
            'servers',
            'advanced',
            'monitoring',
            'layouts',
            'bookmarks',
        ];
        const currentRoute = routesChecked.find(route => state.url.includes(route));
        const systemId =
            environment.isLocal ||
            route.pathFromRoot.find(snapshot => snapshot.params.systemId).params.systemId;

        const checkPermissionsFor = (system: NxSystem): boolean | Promise<boolean> => {
            const permissions = system.userManager.permissions;
            const isOwner = system.userManager.isMySystem;
            const isAdmin = permissions.isAdmin || isOwner;

            // https://networkoptix.atlassian.net/wiki/spaces/FS/pages/2786951363/Bookmarks+on+Cloud#User-Permissions-new
            /* This condition should be kept in sync with the node add condition
            for header in menus.service.ts */
            const canViewBookmarks =
                this.configService.flagsEnabled('bookmarks') &&
                system.version >= 5 &&
                system.userManager.currentUser.permissions.includes(
                    'GlobalViewBookmarksPermission',
                ) &&
                !this.deviceService.isMobile();

            const canViewChecks = {
                users: permissions.editUsers,
                'cloud-storage': system.canUserViewCloudStorage(),
                health: system.userManager.canViewInfo(),
                licenses: isAdmin,
                advanced: isAdmin,
                servers: isAdmin,
                monitoring: isAdmin,
                layouts: (system.version || parseFloat(system.info.version)) >= 5.1,
                bookmarks: canViewBookmarks,
            };

            return (
                canViewChecks[currentRoute] ||
                this.router.navigate([environment.isLocal ? '/settings/' : `/systems/${systemId}`])
            );
        };

        const accountPromise = this.accountService.account
            ? Promise.resolve(this.accountService.account)
            : this.accountService.get();

        return accountPromise.then(async account => {
            if (!account) {
                return;
            }
            let currSystem = this.systemService.getCurrentSystem();

            if (!currSystem || (currSystem.id !== systemId && !environment.isLocal)) {
                if (environment.isLocal) {
                    currSystem = this.systemService.createLocalSystem(
                        this.accountService.mediaServerApi,
                        account.id,
                        account.email,
                    );
                } else {
                    currSystem = this.systemService.createSystem(account.email, systemId);
                }

                await currSystem.update();
                this.settingsService.system = currSystem;
            }
            if (currSystem.userManager.users === undefined) {
                currSystem.userManager.currentUserEmail ||= account.email;
                // Patch for systems.service creating systems with no user email
                try {
                    await currSystem.userManager.getUsersDataFromTheSystem();
                } catch (e) {
                    if (e === 'Media server cloud not be reached.') {
                        const cloudUsers = await currSystem.getUsersCachedInCloud();
                        currSystem.userManager.processUsers(cloudUsers);
                    } else {
                        throw e;
                    }
                }
            }
            this.menusService.currentUser = currSystem.userManager.currentUser;
            this.menusService.updateActiveSystemMenu(
                currSystem,
                currSystem.userManager.permissions.isAdmin,
            );

            if (!this.settingsService.system) {
                this.settingsService.system = currSystem;
            }

            if (currentRoute) {
                return checkPermissionsFor(currSystem);
            } else {
                // Auth guard has already checked user is logged in
                return true;
            }
        });
    }
}
