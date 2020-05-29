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

@Injectable()
export class SystemGuard implements CanActivate {
    CONFIG: IConfig;
    system: NxSystem;

    constructor(
        configService: NxConfigService,
        private router: Router,
        private accountService: NxAccountService,
        private systemService: NxSystemService
    ) {
        this.CONFIG = configService.getConfig();
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        const routesChecked = ['users', 'cloud-storage', 'health', 'licenses'];
        const currentRoute = routesChecked.find(route => state.url.includes(route));
        const systemId = route.pathFromRoot.find((snapshot: any) => {
            return snapshot.params.systemId;
        }).params.systemId;

        return systemId && currentRoute && this.accountService
            .get()
            .then(account => {
                if (account) {
                    this.system = this.systemService.createSystem(account.email, systemId);
                    return this.system.getInfoAndPermissions()
                        .then((system) => {
                            const canViewChecks = {
                                users           : system.permissions.editUsers,
                                'cloud-storage' : system.canUserViewCloudStorage(),
                                health          : system.canViewInfo(),
                                licenses        : system.isAdmin || system.isOwner
                            };
                            return canViewChecks[currentRoute] || this.router.navigate([`/systems/${systemId}`]);
                        })
                        .catch(() => this.router.navigate([`/systems/${systemId}`]));
                }
            });
    }
}
