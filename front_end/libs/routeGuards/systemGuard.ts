import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Observable, firstValueFrom, map } from 'rxjs';

import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemAPI } from '@services/system-legacy-api.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';

@Injectable()
export class SystemGuard {
    public loading = false;

    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private menusService: NxMenusService,
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

        const restrictedRoutes = [
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
        const currentRoute = restrictedRoutes.find(route => state.url.includes(route));
        const systemId =
            environment.isLocal ||
            route.pathFromRoot.find(snapshot => snapshot.params.systemId).params.systemId;

        const checkPermissionsFor = (system: NxSystem): boolean | Promise<boolean> => {
            const permissions = system.permissionManager.permissions();
            const isOwner = system.permissionManager.isOwner();
            const isAdmin = permissions.isAdmin || isOwner;

            const canViewChecks = {
                users: permissions.editUsers,
                'cloud-storage': system.canUserViewCloudStorage(),
                health: permissions.systemHealth,
                licenses: isAdmin,
                advanced: isAdmin,
                servers: isAdmin,
                monitoring: permissions.viewLogs,
                layouts: system.canViewLayouts(),
                bookmarks: system.canViewBookmarks(
                    this.deviceService.isMobile() || this.deviceService.isTablet(),
                ),
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
                    const sysInfo = await firstValueFrom(
                        this.systemsService.systemsSubject.pipe(
                            map(systems => systems.find(system => system.id === systemId)),
                        ),
                    );

                    if (!sysInfo) {
                        return true;
                    }
                    // TODO: Clean up create system args
                    currSystem = this.systemService.createSystem(
                        account.email,
                        systemId,
                        null,
                        false,
                        false,
                        sysInfo.version,
                    );
                    /* Need to initialize with actual version here for bookmarks
                    since without it the mediaserver will default to legacy */
                }

                const cookieLoginEnabledSystem = (
                    mediaserver: NxSystemRestAPI | NxSystemAPI,
                ): mediaserver is NxSystemRestAPI =>
                    mediaserver instanceof NxSystemRestAPI && nxConfig.featureFlags.restCookieLogin;

                if (cookieLoginEnabledSystem(currSystem.mediaserver)) {
                    await firstValueFrom(currSystem.mediaserver.setAccessTokenAsCookie());
                }
                await currSystem.update();
            }

            this.menusService.currentUser = currSystem.permissionManager.currentUser();
            this.menusService.updateActiveSystemMenu(
                currSystem,
                currSystem.permissionManager.isAdmin(),
            );

            if (currentRoute) {
                return checkPermissionsFor(currSystem);
            } else {
                // Auth guard has already checked user is logged in
                return true;
            }
        });
    }
}
