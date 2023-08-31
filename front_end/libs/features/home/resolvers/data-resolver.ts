import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';

type routeData = {
    inOrganization: boolean;
    inSubchannel: boolean;
};

export const WithParentDataResolver: ResolveFn<routeData> = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): routeData => {
    let data = Object.keys(route.parent.data).includes('inOrganization')
        ? route.parent.data
        : route.parent.parent.data;
    data = data.parentData ?? data;

    return { inOrganization: data.inOrganization, inSubchannel: data.inSubchannel };
};
