import { inject } from '@angular/core';
import {
    Route,
    UrlSegment,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    UrlTree,
    Router,
    CanActivateFn,
    CanMatchFn,
} from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

import { NxConfigService } from '@services/nx-config/nx-config.service';

function enabled(route: Route | ActivatedRouteSnapshot): boolean {
    const configService: NxConfigService = inject(NxConfigService);
    const cookieService: CookieService = inject(CookieService);
    const { flags, override } = route.data;
    const flagEnabled = configService.flagsEnabled(flags);
    const hasOverride = override && cookieService.get(override);
    return flagEnabled || !!hasOverride;
}

export const FeatureGuardActivate: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean => {
    return enabled(route);
};

export const FeatureGuardMatch: CanMatchFn = (
    route: Route,
    segments: UrlSegment[],
): Promise<UrlTree> | boolean => {
    const router: Router = inject(Router);
    const enable = enabled(route);

    if (!enable && segments[0].path === 'systems') {
        return Promise.resolve(router.parseUrl(segments.slice(0, 2).join('/')));
    }

    return enable;
};
