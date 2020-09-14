import {
    ActivatedRouteSnapshot,
    CanActivate, Router,
    RouterStateSnapshot, UrlTree
}                                    from '@angular/router';
import { Injectable }                from '@angular/core';
import { Observable }                from 'rxjs';

import { NxAccountService }          from '../services/account.service';
import { NxConfigService, IConfig }  from '../services/nx-config';
import { NxSystem, NxSystemService } from '../services/system.service';
import { NxSettingsService }         from '../pages/systems/settings/settings.service';

@Injectable()
export class SystemGuard implements CanActivate {
    CONFIG: IConfig;
    system: NxSystem;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private settingsService: NxSettingsService
    ) {
        this.CONFIG = configService.getConfig();
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        const routesChecked = ['users', 'cloud-storage', 'health', 'licenses'];
        const currentRoute = routesChecked.find(route => state.url.includes(route));
        const systemId = this.CONFIG.isLocal || route.pathFromRoot.find((snapshot: any) => {
            return snapshot.params.systemId;
        }).params.systemId;

        const checkPermissions = (system = this.system) => {
            const canViewChecks = {
                users           : system.permissions.editUsers,
                'cloud-storage' : system.canUserViewCloudStorage(),
                health          : system.canViewInfo(),
                licenses        : system.isAdmin || system.isOwner
            };
            return canViewChecks[currentRoute] || this.router.navigate(
                [NxConfigService.isLocal ? '/settings/' : `/systems/${systemId}`]
            );
        };

        return systemId && currentRoute && this.accountService
            .get()
            .then(account => {
                if (account) {
                    if (this.CONFIG.isLocal) {
                        this.system = this.settingsService.system;
                        return new Promise((resolve) => {
                            if (this.system) {
                                resolve(checkPermissions());
                            } else {
                                this.settingsService.system = this.systemService.createLocalSystem(
                                    this.accountService.mediaServerApi, account.id, account.email
                                );
                                (<NxSystem> this.settingsService.system).update().then(_ => {
                                    (<NxSystem> this.settingsService.system).getInfoAndPermissions().then(_ => {
                                        this.system = this.settingsService.system;
                                        resolve(checkPermissions());
                                    });
                                });
                            }
                        });
                    } else {
                        this.system = this.systemService.createSystem(account.email, systemId, undefined, true);
                        return this.system.getInfoAndPermissions()
                            .then(checkPermissions)
                            .catch(() => this.router.navigate([`/systems/${systemId}`]));
                    }
                }
            });
    }
}
