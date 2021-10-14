import { Injectable } from '@angular/core';
import { Router, CanActivate, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

import { NxUriService } from '@services/uri.service';
import { NxAccountService } from '@services/account.service';
import { NxUtilsService } from '@services/utils.service';

/**
 * A route guard to stop WebAdmin from getting stuck in an infinite loading
 * loop inside `users.component.ts` when accessing `/users`
 */
@Injectable()
export class UsersGuard implements CanActivate {
    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private uriService: NxUriService
    ) {}

    canActivate(
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        this.accountService
            .get()
            .then(account => {
                const userId = NxUtilsService.cleanId(account.id);
                this.router.navigate([
                    this.uriService.getSystemSettingsRoute({ userId })
                ]);
            });
        // After AuthGuard and SystemGuard, user should be logged in
        return true;
    }
}
