import { Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate,
    Router,
    RouterStateSnapshot,
    UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import { NxAccountService } from '@services/account.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import type {
    SystemPermissions
} from '@services/system.service/user-manager/user-manager-types';

@Injectable()
export class SystemGuard implements CanActivate {
    public loading = false;

    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private settingsService: NxSettingsService
    ) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
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
            'layouts'
        ];
        const currentRoute = routesChecked.find(route => state.url.includes(route));
        const systemId = environment.isLocal ||
            route.pathFromRoot.find(snapshot => snapshot.params.systemId)
                .params.systemId;

        const checkPermissionsFor = (system: NxSystem): boolean | Promise<boolean> => {
            const permissions = system.userManager?.permissions || {} as SystemPermissions;
            const isOwner = system.userManager.isOwner(system.userManager.currentUser);
            const canViewChecks = {
                users: permissions.editUsers,
                'cloud-storage': system.canUserViewCloudStorage(),
                health: system.userManager.canViewInfo(),
                licenses: permissions.isAdmin || isOwner,
                advanced: permissions.isAdmin || isOwner,
                servers: permissions.isAdmin || isOwner,
                monitoring: permissions.isAdmin || isOwner,
                layouts: (system.version || parseFloat(system.info.version)) >= 5.1
            };

            return canViewChecks[currentRoute] || this.router.navigate(
                [environment.isLocal ? '/settings/' : `/systems/${systemId}`]
            );
        };

        if (!(systemId && currentRoute)) {
            return;
        }
        return this.accountService.get().then(async account => {
            if (!account) {
                return;
            }
            let currSystem = this.systemService.getCurrentSystem();

            if (!currSystem) {
                if (environment.isLocal) {
                    currSystem = this.systemService.createLocalSystem(
                        this.accountService.mediaServerApi,
                        account.id,
                        account.email
                    );
                } else {
                    currSystem = this.systemService.createSystem(
                        account.email,
                        systemId,
                        undefined,
                        true
                    );
                }

                await currSystem.update();
                this.settingsService.system = currSystem;
            }
            if (currSystem.userManager.users === undefined) {
                await currSystem.userManager.getUsersDataFromTheSystem();
            }

            if (!this.settingsService.system) {
                this.settingsService.system = currSystem;
            }

            return checkPermissionsFor(currSystem);
        });
    }
}
