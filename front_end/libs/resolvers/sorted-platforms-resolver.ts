import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn, RouterStateSnapshot } from '@angular/router';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { Platform } from '@services/nx-cloud-api/nx-cloud-api.types';
import { Arm } from '@services/nx-config/base-config';
import { NxConfigService } from '@services/nx-config/nx-config.service';

export const SortedPlatformsResolver: ResolveFn<Promise<Platform[]>> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const { platform, releaseType } = route.params;

    if (!platform || !releaseType) {
        return [];
    }

    const configDownloads = inject(NxConfigService).getConfig().downloads;
    const data = await inject(NxCloudApiService).getDownloadsReleases();

    const groupPlatforms = Object.values(configDownloads.groups).reduce(
        (platforms, checkPlatform: Arm) => {
            const platform = data[releaseType].platforms.find(
                downloadsPlatform => downloadsPlatform.name === checkPlatform.name,
            );
            if (platform?.files.length > 0) {
                platforms.push(platform);
            }
            return platforms;
        },
        [],
    );
    if (releaseType === 'releases') {
        groupPlatforms.push({
            name: 'mobile',
            files: [],
        });
    }
    return groupPlatforms;
};
