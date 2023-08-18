import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';

import { WINDOW } from '@services/window-provider';

export const RedirectAuthGuard: CanActivateFn = (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
): boolean => {
    const iWindow: Window = inject(WINDOW);
    const { url } = state;
    let newUrl = '';
    // exists to handle register & restore password for systems < 5.0 on desktop login
    if (url.includes('register')) {
        newUrl = '/authorize?client_type=create';
    } else if (url.includes('restore_password')) {
        newUrl = '/authorize/restore_password';
    }
    if (newUrl) {
        iWindow.location.href = newUrl;
    }
    return false;
};
