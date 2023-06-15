import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable()
export class OrgResolver {
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        // May refactor to check children static data opposed to url check.
        return state.url.includes('organization');
    }
}
