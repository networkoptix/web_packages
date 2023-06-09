import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';

type routeData = {
    inOrganization: boolean;
    inSubchannel: boolean;
};

@Injectable()
export class WithParentDataResolver implements Resolve<routeData> {
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<routeData> {
        return new Promise(resolve => {
            setTimeout(() => {
                let data = Object.keys(route.parent.data).length
                    ? route.parent.data
                    : route.parent.parent.data;
                data = data.parentData ?? data;
                const a = {
                    inOrganization: data.inOrganization,
                    inSubchannel: data.inSubchannel,
                };
                resolve(a);
            });
        });
    }
}
