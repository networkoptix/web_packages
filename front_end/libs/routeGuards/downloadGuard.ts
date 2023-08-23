import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';

import { NxAccountService } from '@services/account.service';
import { isAccount } from '@services/account.service/account';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

export const DownloadGuard: ResolveFn<boolean> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const CONFIG: IConfig = inject(NxConfigService).getConfig();
    const accountService = inject(NxAccountService);
    let canViewDownloads: boolean;

    if (!CONFIG.cloudCapabilities.publicDownloads) {
        accountService.requireLogin().then(result => {
            if (isAccount(result)) {
                canViewDownloads = true;
            }
        });
    } else {
        canViewDownloads = true;
    }
    return canViewDownloads;
};
