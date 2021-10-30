import { Injectable } from '@angular/core';
import {
    Router,
    CanActivate,
    UrlTree,
    ActivatedRouteSnapshot,
    RouterStateSnapshot
} from '@angular/router';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { NxUriService } from '@services/uri.service';
import { NxAccountService } from '@services/account.service';
import { NxUtilsService } from '@services/utils.service';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import type { NxSystem } from '@services/system.service';

/**
 * A route guard to stop WebAdmin from getting stuck in an infinite loading
 * loop inside `NxSystemUsersComponent` when accessing `/users` or a
 * nonexistent user.
 */
@Injectable()
export class UsersGuard implements CanActivate {
    constructor(
        private router: Router,
        private accountService: NxAccountService,
        private uriService: NxUriService,
        private settingsService: NxSettingsService
    ) {}

    redirectToCurrentUser(): void {
        this.accountService
            .get()
            .then(account => {
                const userId = NxUtilsService.cleanId(account.id);
                this.router.navigate([
                    this.uriService.getSystemSettingsRoute({ userId })
                ]);
            });
    }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        if (state.url === '/settings/users') {
            this.redirectToCurrentUser();
        } else {
            const targetId = `{${state.url.split('/').pop()}}`;
            let stable = false;
            let systemId = '';
            this.settingsService.systemSubject
                .pipe(filter(data => data !== undefined))
                .subscribe((system: NxSystem) => {
                    if (system && system.id && system.id === systemId && !stable) {
                        // We want the redirect only to fire once
                        // after the system has stabilized
                        stable = true;
                        const idMatch = system.userManager.users.some(user => (
                            user.id === targetId
                        ));
                        if (!idMatch) {
                            this.redirectToCurrentUser();
                        }
                    } else if (!stable) {
                        systemId = system.id;
                    }
                });
        }

        // After AuthGuard and SystemGuard, user should be logged in
        return true;
    }
}
