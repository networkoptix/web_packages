import { Inject, Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivate,
    RouterStateSnapshot,
    UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';

import { WINDOW } from '@services/window-provider';

@Injectable()
export class RedirectAuthGuard implements CanActivate {
    constructor(
        @Inject(WINDOW) private window: Window
    ) {}

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        const { url } = state;
        let newUrl = '';
        // exists to handle register & restore password for systems < 5.0 on desktop login
        if (url.includes('register')) {
            newUrl = '/authorize?client_type=create';
        } else if (url.includes('restore_password')) {
            newUrl = '/authorize/restore_password';
        }
        if (newUrl) {
            this.window.location.href = newUrl;
        }
        return false;
    }
}
