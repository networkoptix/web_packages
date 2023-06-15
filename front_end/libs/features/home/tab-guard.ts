import { Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate,
    Router,
    RouterStateSnapshot,
    UrlTree,
} from '@angular/router';
import { Observable } from 'rxjs';

@Injectable()
export class TabGuard implements CanActivate {
    constructor(private router: Router) {}
    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
    ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        return new Promise(resolve =>
            setTimeout(() => {
                if (route.parent?.parent?.data?.isAdmin || route.parent?.data?.isAdmin) {
                    return resolve(true);
                }
                this.router.navigate(['404']);
                resolve(false);
            }),
        );
    }
}
