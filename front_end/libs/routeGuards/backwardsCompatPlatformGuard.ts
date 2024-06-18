import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';

import { nxConfig } from '@services/nx-config/config';

export const BackwardsCompatPlatformGuard = (
    route: ActivatedRouteSnapshot,
): Promise<boolean> | boolean => {
    const router = inject(Router);
    const platform = route.params.platform;
    if (platform in nxConfig.downloads.groups) {
        return router.navigate([`/download/releases/${platform}`]);
    }
    return false;
};
