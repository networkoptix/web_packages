import { Injectable } from '@angular/core';
import {
    CanActivate, ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';

import { NxAccountService, Account } from '../services/account.service';

@Injectable()
export class RedirectGuard implements CanActivate {
    constructor(
        private router: Router,
        private accountService: NxAccountService
    ) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        return this.accountService.get().then((account: Account) => {
            // eslint-disable-next-line camelcase
            if (account?.is_authenticated) {
                this.router.navigate(['systems']);
            } else {
                return true;
            }
        });
    }
}
