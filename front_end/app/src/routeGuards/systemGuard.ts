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

        const routesChecked = ['users', 'cloud-storage', 'health', 'licenses', 'servers', 'advanced'];
        const currentRoute = routesChecked.find(route => state.url.includes(route));
        const systemId = environment.isLocal || route.pathFromRoot.find((snapshot: any) => {
            return snapshot.params.systemId;
        }).params.systemId;

        const checkPermissionsFor = (system: NxSystem) => {
            const permissions: any = system.userManager?.permissions || {};
            const isOwner = system.userManager.isOwner(system.userManager.currentUser);
            const canViewChecks = {
                users: permissions.editUsers,
                'cloud-storage': system.canUserViewCloudStorage(),
                health: system.canViewInfo(),
                licenses: permissions.isAdmin || isOwner,
                advanced: permissions.isAdmin || isOwner,
                servers: permissions.isAdmin || isOwner
            };

            return canViewChecks[currentRoute] || this.router.navigate(
                [environment.isLocal ? '/settings/' : `/systems/${systemId}`]
            );
        };

        return systemId && currentRoute && this.accountService
            .get()
            .then(account => {
                if (account) {
                    let currSystem = this.systemService.getCurrentSystem();
                    if (!this.settingsService.system) {
                        this.settingsService.system = currSystem;
                    }

                    return new Promise(resolve => {
                        if (currSystem) {
                            currSystem.update().then(_ => {
                                resolve(checkPermissionsFor(currSystem));
                            });
                        } else {
                            if (environment.isLocal) {
                                currSystem = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
                            } else {
                                currSystem = this.systemService.createSystem(account.email, systemId, undefined, true);
                            }

                            currSystem.update().then(_ => {
                                this.settingsService.system = currSystem;
                                resolve(checkPermissionsFor(currSystem));
                            });
                        }
                    });
                }
            });
    }
}
