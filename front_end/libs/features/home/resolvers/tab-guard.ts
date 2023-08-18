import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
} from '@angular/router';

export const TabGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean => {
    const router: Router = inject(Router);
    if (route.parent?.parent?.data?.isAdmin || route.parent?.data?.isAdmin) {
        return true;
    }
    router.navigate(['404']);
    return false;
};
