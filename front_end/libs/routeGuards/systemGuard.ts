import { inject, Injector } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { firstValueFrom, map } from 'rxjs';

import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemAPI } from '@services/system-legacy-api.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';

export const SystemGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): Promise<boolean> | boolean => {
    const router: Router = inject(Router);
    const injector = inject(Injector);
    const accountService: NxAccountService = inject(NxAccountService);
    const systemService: NxSystemService = inject(NxSystemService);
    const systemsService: NxSystemsService = inject(NxSystemsService);
    const menusService: NxMenusService = inject(NxMenusService);
    const deviceService: DeviceDetectorService = inject(DeviceDetectorService);
    const cloudApiService = inject(NxCloudApiService);

    if (!environment.isWebadmin && state.url === '/health-report') {
        // navigate to report viewer if viewing /health route
        return router.navigate(['/health-report/viewer']);
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
        'view',
        'services',
    ];
    const currentRoute = restrictedRoutes.find(route => state.url.includes(route));
    const systemId =
        environment.isWebadmin ||
        route.pathFromRoot.find(snapshot => snapshot.params.systemId).params.systemId;

    const checkPermissionsFor = (system: NxSystem): boolean | Promise<boolean> => {
        const permissions = system.permissionManager.permissions$$();
        const isOwner = system.permissionManager.isOwner$$();
        const isAdmin = system.permissionManager.isAdmin$$() || isOwner;
        const canViewChecks = {
            users: permissions.editUsers,
            'cloud-storage': system.canUserViewCloudStorage(),
            health: permissions.systemHealth,
            // TODO: when !isWebadmin check system info using isUserSystem util.
            //  Leaving as true for vms_6.0 since it doesn't use cloud.
            licenses: isAdmin && (environment.isWebadmin ? !nxConfig.organizationId : true),
            advanced: isAdmin,
            servers: isAdmin,
            monitoring: permissions.systemHealth,
            layouts: system.canViewLayouts(),
            bookmarks: system.canViewBookmarks(
                deviceService.isMobile() || deviceService.isTablet(),
            ),
            view: system.canViewADevice(),
            services: permissions.viewServices,
        };

        return (
            canViewChecks[currentRoute] ||
            router.navigate([environment.isWebadmin ? '/settings/' : `/systems/${systemId}`])
        );
    };

    const accountPromise = accountService.account
        ? Promise.resolve(accountService.account)
        : accountService.get();

    return accountPromise.then(async account => {
        if (!account) {
            return false;
        }
        let currSystem = systemService.getCurrentSystem();

        if (!currSystem || (currSystem.id !== systemId && !environment.isWebadmin)) {
            if (environment.isWebadmin) {
                currSystem = systemService.createLocalSystem(
                    accountService.mediaServerApi,
                    account.id,
                    account.email,
                );
            } else {
                const sysInfo = await firstValueFrom(
                    systemsService.systemsSubject.pipe(
                        map(systems => systems.find(system => system.id === systemId)),
                    ),
                );

                if (!sysInfo) {
                    try {
                        const info = await firstValueFrom(
                            cloudApiService.cloudChannelPartnersApi.getSystem(systemId),
                        );
                        if (currentRoute === 'services') {
                            menusService.serviceMode(systemId, info.name);
                            return true;
                        }
                        return router.navigate(['/']);
                    } catch {
                        return router.navigate(['systems', 'no-access'], {
                            skipLocationChange: true,
                        });
                    }
                }

                // TODO: Clean up create system args
                currSystem = systemService.createSystem(
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
                mediaserver instanceof NxSystemRestAPI && !!nxConfig.featureFlags.restCookieLogin;

            if (currSystem.isOnline && cookieLoginEnabledSystem(currSystem.mediaserver)) {
                try {
                    await firstValueFrom(currSystem.mediaserver.setAccessTokenAsCookie());
                } catch (e) {
                    console.error(e);
                }
            }
        }

        if (!currSystem.permissionManager.currentUser$$()) {
            await currSystem.update();
        }

        const currentUser = await firstValueFrom(
            currSystem.permissionManager.permissionsInitialized(injector),
        );
        if (currentUser) {
            menusService.currentUser = currentUser;
        }
        menusService.updateActiveSystemMenu(currSystem);

        if (currentRoute) {
            return checkPermissionsFor(currSystem);
        } else {
            // Auth guard has already checked user is logged in
            return true;
        }
    });
};
