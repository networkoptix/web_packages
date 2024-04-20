import { inject } from '@angular/core';
import { Route, UrlSegment, UrlTree, Router } from '@angular/router';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { Build } from '@services/nx-cloud-api/nx-cloud-api.types';
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
            const cloudApiService = inject(NxCloudApiService);
            try {
                const data = await cloudApiService.getDownloadsHistory(undefined);

                let type = Object.keys(data)
                    .filter(key => key !== 'updatesPrefix')
                    .find(k =>
                        data[k].some(releaseType =>
                            [releaseType.version, releaseType.buildNumber].includes(segment),
                        ),
                    );

                if (!type) {
                    const build = (await cloudApiService.getDownloadsHistory(segment)) as Build;
                    type = build.type;
                }

                if (type) {
                    return router.navigate([`download/other/${type}`], { fragment: segment });
                }
            } catch {
                console.error('Builds are private and require login!!!');
            }
            return router.navigate(['404']);
        } else {
            return router.navigate([`download/other`]);
        }
    }
};
