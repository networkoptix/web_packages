import { inject } from '@angular/core';
import {
    Route,
    UrlSegment,
    ActivatedRouteSnapshot,
    UrlTree,
    Router,
    CanActivateFn,
    CanMatchFn,
} from '@angular/router';

import { nxConfig } from '@services/nx-config/config';
import { redirect } from '@static-variables';

function enabled(route: Route | ActivatedRouteSnapshot): boolean {
    return !!route.data?.flag && !!nxConfig.featureFlags[route.data.flag];
}

export const FeatureGuardActivate: CanActivateFn = (
    route: ActivatedRouteSnapshot,
): boolean | Promise<boolean> =>
    enabled(route) ||
    inject(Router).navigate([
        nxConfig.featureFlags.channelPartners ? redirect.channelPartners : redirect.authorised,
    ]);

export const FeatureGuardMatch: CanMatchFn = (
    route: Route,
    segments: UrlSegment[],
): Promise<UrlTree> | boolean => {
    const router: Router = inject(Router);
    const enable = enabled(route);

    // If the feature is not enabled and we are on a system, redirect to the system settings page
    if (!enable && segments[0].path === 'systems') {
        return Promise.resolve(router.parseUrl(segments.slice(0, 2).join('/')));
    }

    return enable;
};
