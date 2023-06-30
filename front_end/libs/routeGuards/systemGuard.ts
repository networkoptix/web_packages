import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Observable, firstValueFrom, map } from 'rxjs';

import { environment } from '@environments/environment';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemAPI } from '@services/system-legacy-api.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import type { NxUser } from '@services/system.service/user-manager/user-manager-types';
import { NxSystemsService } from '@services/systems.service';

@Injectable()
export class SystemGuard {
    public loading = false;

    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
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
            const permissions = system.userManager.permissions;
            const isOwner = system.userManager.isMySystem;
            const isAdmin = permissions.isAdmin || isOwner;
            const sysVersion = system.version || parseFloat(system.info.version);

            // https://networkoptix.atlassian.net/wiki/spaces/FS/pages/2786951363/Bookmarks+on+Cloud#User-Permissions-new
            /* This condition should be kept in sync with the node add condition
            for header in menus.service.ts */
            const canViewBookmarks =
                this.configService.flagsEnabled('bookmarks') &&
                sysVersion >= 5 &&
                system.userManager.currentUser.permissions.includes(
                    'GlobalViewBookmarksPermission',
                ) &&
                !(this.deviceService.isMobile() || this.deviceService.isTablet());

            const canViewChecks = {
                users: permissions.editUsers,
                'cloud-storage': system.canUserViewCloudStorage(),
                health: system.userManager.canViewInfo(),
                licenses: isAdmin,
                advanced: isAdmin,
                servers: isAdmin,
                monitoring: isAdmin,
                layouts: system.canViewLayouts(),
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
                    const sysInfo = await firstValueFrom(
                        this.systemsService.systemsSubject.pipe(
                            map(systems => systems.find(system => system.id === systemId)),
                        ),
                    );
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
                this.settingsService.system = currSystem;
            }
            if (currSystem.userManager.users === undefined) {
                try {
                    await currSystem.userManager.getUsersDataFromTheSystem();
                } catch (e) {
                    if (e === 'Media server cloud not be reached.') {
                        const cloudUsers = await currSystem.getUsersCachedInCloud();
                        if (cloudUsers instanceof HttpErrorResponse && cloudUsers.status === 403) {
                            // Non-admin user doesn't have permission to view cached cloud users
                            const accessRole = currSystem.info.accessRole as string;
                            const permissions = nxConfig.accessRoles.predefinedRoles.find(role => {
                                let name = role.name.replace(' ', '');
                                name = name.charAt(0).toLowerCase() + name.slice(1);
                                // Live Viewer => liveViewer
                                return accessRole === name;
                            }).permissions;

                            currSystem.userManager.currentUser = { permissions } as NxUser;
                            // We only care about permissions here
                        } else {
                            currSystem.userManager.processUsers(cloudUsers);
                        }
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
