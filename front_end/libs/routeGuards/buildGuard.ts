import { inject } from '@angular/core';
import { Route, UrlSegment, UrlTree, Router } from '@angular/router';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';

export const BuildGuard = async (
    route: Route,
    segments: UrlSegment[],
): Promise<Promise<UrlTree> | boolean> => {
    const router: Router = inject(Router);
    const segment = segments[1]?.path;

    if (!nxConfig.featureFlags.enhancedDownloads) {
        return true;
    } else {
        if (segment) {
            const data = await inject(NxCloudApiService).getDownloadsHistory(undefined);
            delete data.updatesPrefix;

            const type = Object.keys(data).find(k =>
                data[k].some(releaseType => releaseType.version === segment),
            );

            if (type) {
                return router.navigate([`download/other/${type}`], { fragment: segment });
            }
            return false;
        } else {
            return router.navigate([`download/other`]);
        }
    }
};
