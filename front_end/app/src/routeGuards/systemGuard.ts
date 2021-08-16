import {
    ActivatedRouteSnapshot,
    CanActivate, Router,
    RouterStateSnapshot, UrlTree
}                                    from '@angular/router';
import { Injectable }                from '@angular/core';
import { Observable, Subject }       from 'rxjs';

import { environment }               from '@environments/environment';
import { NxAccountService }          from '@services/account.service';
import { NxSystem, NxSystemService } from '@services/system.service';
import { NxSettingsService }         from '@pages/systems/settings/settings.service';

@Injectable()
export class SystemGuard implements CanActivate {
    private loading$ = new Subject<boolean>();
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
            const permissions = system.userManager.permissions;
            const isOwner = system.userManager.isOwner(system.userManager.currentUser);
            const canViewChecks = {
                users           : permissions.editUsers,
                'cloud-storage' : system.canUserViewCloudStorage(),
                health          : system.canViewInfo(),
                licenses        : permissions.isAdmin || isOwner,
                advanced        : permissions.isAdmin || isOwner,
                servers         : permissions.isAdmin || isOwner
            };
            return canViewChecks[currentRoute] || this.router.navigate(
                [environment.isLocal ? '/settings/' : `/systems/${systemId}`]
            );
        };

        return systemId && currentRoute && this.accountService
            .get()
            .then(async(account) => {
                if (account) {
                    const currSystem = this.systemService.getCurrentSystem();
                    if (!this.settingsService.system) {
                        this.settingsService.system = currSystem;
                    }

                    return new Promise((resolve) => {
                        if (currSystem) {
                            resolve(checkPermissionsFor(currSystem));
                        } else {
                            let systemPromise;
                            if (environment.isLocal) {
                                systemPromise = Promise.resolve(this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email));
                            } else {
                                systemPromise = this.systemService.createSystem(account.email, systemId, undefined, true);
                            }
                            systemPromise.then(system => {
                                this.settingsService.system = system;

                                (<NxSystem> this.settingsService.system).update().then(_ => {
                                    (<NxSystem> this.settingsService.system).getInfoAndPermissions().then(_ => {
                                        resolve(checkPermissionsFor(this.settingsService.system));
                                    });
                                });
                            });
                        }
                    });
                }
            });
    }
}
