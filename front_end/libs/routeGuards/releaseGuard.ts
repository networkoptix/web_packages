import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';
import { filter, take } from 'rxjs/operators';

import { permissions } from '@pages/static-variables-features';
import { NxAccountService } from '@services/account.service';
import { isAccount } from '@services/account.service/account';
import { NxAppStateService } from '@services/nx-app-state.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

export const ReleaseGuard: ResolveFn<boolean> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const CONFIG: IConfig = inject(NxConfigService).getConfig();
    const accountService = inject(NxAccountService);
    const appStateService = inject(NxAppStateService);
    let canViewRelease: boolean;
    let build: string;

    if (/(?:(?:\d*\.){2,3})?\d+(?: \w\d+)?/.test(route.params.type)) {
        build = route.params.type;
    }

    if (!CONFIG.cloudCapabilities.publicReleases) {
        if (build) {
            canViewRelease = true;
        }

        accountService.requireLogin().then(account => {
            canViewRelease =
                isAccount(account) &&
                (account.is_superuser || account.permissions.includes(permissions.canViewRelease));
        });
    } else if (appStateService.ready) {
        canViewRelease = true;
        if (build === undefined) {
            return true;
        } else {
            appStateService.readySubject
                .pipe(
                    filter(ready => ready),
                    take(1),
                )
                .subscribe(() => {
                    canViewRelease = true;
                });
        }
    }

    return canViewRelease;
};
