import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';

@Injectable()
export class TabResolver implements Resolve<string> {
    resolve(route: ActivatedRouteSnapshot): string {
        return route.children[0].routeConfig.path;
    }
}
