import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';

import { DownloadsService } from '@pages/download-updated/downloads.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { Platform } from '@services/nx-cloud-api/nx-cloud-api.types';
import { Arm } from '@services/nx-config/base-config';
import { NxConfigService } from '@services/nx-config/nx-config.service';

export const SortedPlatformsResolver: ResolveFn<Promise<Platform[]>> = async (
    route: ActivatedRouteSnapshot,
) => {
    const { platform, releaseType } = route.params;

    if (!platform || !releaseType) {
        return [];
    }
    const ds = inject(DownloadsService);
    ds.platform$$.set(platform);
    ds.type$$.set(releaseType);

    const configDownloads = inject(NxConfigService).getConfig().downloads;
    const data = await inject(NxCloudApiService).getDownloadsReleases();

    const groupPlatforms = Object.values(configDownloads.groups).reduce(
        (platforms, checkPlatform: Arm) => {
            const platform = data?.[releaseType].platforms.find(
                downloadsPlatform => downloadsPlatform.name === checkPlatform.name,
            );
            if (platform?.files.length > 0) {
                platforms.push(platform);
            }
            return platforms;
        },
        [],
    );

    groupPlatforms.push({
        name: 'mobile',
        files: [],
    });

    return groupPlatforms;
};
