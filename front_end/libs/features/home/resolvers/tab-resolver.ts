import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';

export const TabResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot): string => {
    let path = route.children[0].routeConfig.path;
    // Due to nested router-outlets groups do not have children routes and each path for group tabs are direct children of :organizationId path
    if (path?.includes('group/:groupId')) {
        path = path.replace('group/:groupId', '');
    }
    return path || 'systems';
};
