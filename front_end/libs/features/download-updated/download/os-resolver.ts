import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { DeviceDetectorService, DeviceInfo } from 'ngx-device-detector';
import { EMPTY as empty } from 'rxjs';

import type { PlatformMatch } from '@services/nx-config/base-config';
import { NxConfigService } from '@services/nx-config/nx-config.service';

export const OsResolver: ResolveFn<typeof empty> = (): typeof empty => {
    const configService: NxConfigService = inject(NxConfigService);
    const router: Router = inject(Router);
    const deviceInfo: DeviceInfo = inject(DeviceDetectorService).getDeviceInfo();
    const configDownloads = configService.getConfig().downloads;
    const windows: string = configDownloads.groups.windows.name;
    const platformMatch: PlatformMatch = configDownloads.platformMatch;
    const platform: string = platformMatch[deviceInfo.os.toLowerCase()] || windows;
    router.navigate(['/download/' + platform.toLowerCase()]).catch(error => {
        console.error(error);
    });
    return empty;
};
