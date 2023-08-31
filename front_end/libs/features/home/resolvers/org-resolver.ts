import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';

export const OrgResolver: ResolveFn<boolean> = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean => {
    // May refactor to check children static data opposed to url check.
    return state.url.includes('organization');
};
