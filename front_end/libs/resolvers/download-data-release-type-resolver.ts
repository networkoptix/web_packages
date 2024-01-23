import { inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    createUrlTreeFromSnapshot,
    ResolveFn,
    Router,
} from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';

import { NxCloudApiService } from '@services/nx-cloud-api';
import { Downloads } from '@services/nx-config/base-config';
import { NxConfigService } from '@services/nx-config/nx-config.service';

export const DownloadDataReleaseTypeResolver: ResolveFn<Promise<Downloads>> = async (
    route: ActivatedRouteSnapshot,
) => {
    const router = inject(Router);
    const configDownloads = inject(NxConfigService).getConfig().downloads;
    const { platform, releaseType } = route.params;
    // Check for releaseType if its missing redirect and set it to releases by default
    if (!releaseType || !['releases', 'betas', 'patches'].includes(releaseType)) {
        return router.navigateByUrl(createUrlTreeFromSnapshot(route, ['../', 'releases']));
    }

    const deviceInfo = inject(DeviceDetectorService).getDeviceInfo();
    const windows = configDownloads.groups.windows.name;
    const platformMatch = configDownloads.platformMatch;

    // If we cant detect the platform fall back to windows
    if (
        !platform ||
        (!(releaseType === 'releases' && platform === 'mobile') &&
            !Object.keys(configDownloads.groups).includes(platform))
    ) {
        const fallbackPlatform =
            platformMatch[deviceInfo.os.toLowerCase()]?.toLowerCase() || windows;
        return router
            .navigate(['/download/' + releaseType + '/' + fallbackPlatform])
            .catch(error => {
                console.error(error);
            });
    }

    const data = await inject(NxCloudApiService).getDownloadsReleases();
    if (!data) {
        return null;
    }

    data[releaseType].platforms.push({ name: 'mobile', files: [] });
    return data[releaseType];
};
