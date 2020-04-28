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
export class UserGuard implements CanActivate {
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
        let systemId;
        if (this.CONFIG.isLocal) {
            return Promise.resolve(true);
        } else {
            systemId = route.pathFromRoot.find((snapshot: any) => {
                return snapshot.params.systemId;
            }).params.systemId;
        }

        return this.accountService
            .get()
            .then(account => {
                if (account) {
                    this.system = this.systemService.createSystem(account.email, systemId);
                    return this.system.getInfoAndPermissions()
                        .then((system) => {
                            const canView = system.permissions.editUsers;
                            if (!canView) {
                                return this.router.navigate([`/systems/${systemId}`]);
                            }
                            return canView;
                        })
                        .catch(() => this.router.navigate([`/systems/${systemId}`]));
                }
            });
    }
}
