import { Injectable } from '@angular/core';
import { Router, Resolve } from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { EMPTY as empty } from 'rxjs';

import { NxConfigService } from '@services/nx-config/nx-config.service';

@Injectable()
export class OsResolver implements Resolve<any> {
    deviceInfo;
    platform: string;
    platformMatch: {};
    windows: string;

    constructor(
        private configService: NxConfigService,
        private router: Router,
        private deviceService: DeviceDetectorService
    ) {
        this.deviceInfo = this.deviceService.getDeviceInfo();
        const configDownloads = this.configService.getConfig().downloads;
        this.windows = configDownloads.groups.windows.name;
        this.platformMatch = configDownloads.platformMatch;
    }

    resolve() {
        this.platform = this.platformMatch[this.deviceInfo.os.toLowerCase()] || this.windows;
        this.router
            .navigate(['/download/' + this.platform.toLowerCase()])
            .catch(error => {
                console.error(error);
            });
        return empty;
    }
}
