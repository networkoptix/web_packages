import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    CanMatchFn,
    Route,
    Router,
    UrlTree,
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

export const FeatureGuardMatch: CanMatchFn = (route: Route): Promise<UrlTree> | boolean =>
    enabled(route);
