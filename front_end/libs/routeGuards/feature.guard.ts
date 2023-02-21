import { Injectable } from '@angular/core';
import {
    CanActivate,
    CanLoad,
    Route,
    UrlSegment,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    UrlTree,
    Router
} from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';

import { NxConfigService } from '@services/nx-config/nx-config.service';

@Injectable({
    providedIn: 'root'
})
export class FeatureGuard implements CanActivate, CanLoad {
    constructor(private configService: NxConfigService, private cookieService: CookieService, private router: Router) {}

    enabled(route: Route | ActivatedRouteSnapshot): boolean {
        const { flags, override } = route.data;
        const flagEnabled = this.configService.flagsEnabled(flags);
        const hasOverride = override && this.cookieService.get(override);
        return flagEnabled || !!hasOverride;
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this.enabled(route);
    }

    canLoad(
        route: Route,
        segments: UrlSegment[]): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        const enabled = this.enabled(route);

        if (!enabled && segments[0].path === 'systems') {
            return Promise.resolve(this.router.parseUrl(segments.slice(0, 2).join('/')));
        }

        return enabled;
    }
}
