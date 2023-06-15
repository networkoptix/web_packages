import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

type routeData = {
    inOrganization: boolean;
    inSubchannel: boolean;
};

@Injectable()
export class WithParentDataResolver {
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<routeData> {
        return new Promise(resolve => {
            setTimeout(() => {
                let data = Object.keys(route.parent.data).includes('inOrganization')
                    ? route.parent.data
                    : route.parent.parent.data;
                data = data.parentData ?? data;
                resolve({
                    inOrganization: data.inOrganization,
                    inSubchannel: data.inSubchannel,
                });
            });
        });
    }
}
