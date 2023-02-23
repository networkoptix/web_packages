import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

import { NxConfigService } from '@services/nx-config/nx-config.service';

@Injectable()
export class AuthGuard implements CanActivate {
    readonly newSystem: boolean;

    constructor(configService: NxConfigService) {
        this.newSystem = configService.getConfig().newSystem;
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return !this.newSystem;
    }
}
