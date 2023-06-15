import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';

@Injectable()
export class TabResolver {
    resolve(route: ActivatedRouteSnapshot): string {
        return route.children[0].routeConfig.path;
    }
}
