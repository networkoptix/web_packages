import { Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import type { SystemPermissions } from '@services/system.service/user-manager/user-manager-types';

@Injectable()
export class SystemGuard implements CanActivate {
    public loading = false;

    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private settingsService: NxSettingsService,
        private menusService: NxMenusService,
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
        ];
        const currentRoute = routesChecked.find(route => state.url.includes(route));
        const systemId =
            environment.isLocal ||
            route.pathFromRoot.find(snapshot => snapshot.params.systemId).params.systemId;

        const checkPermissionsFor = (system: NxSystem): boolean | Promise<boolean> => {
            const permissions = system.userManager?.permissions || ({} as SystemPermissions);
            const isOwner = system.userManager.isMySystem;
            const canViewChecks = {
                users: permissions.editUsers,
                'cloud-storage': system.canUserViewCloudStorage(),
                health: system.userManager.canViewInfo(),
                licenses: permissions.isAdmin || isOwner,
                advanced: permissions.isAdmin || isOwner,
                servers: permissions.isAdmin || isOwner,
                monitoring: permissions.isAdmin || isOwner,
                layouts: (system.version || parseFloat(system.info.version)) >= 5.1,
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
                await currSystem.userManager.getUsersDataFromTheSystem();
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
