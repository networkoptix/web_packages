import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';

export const TabResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot): string => {
    return route.children[0].routeConfig.path;
};
