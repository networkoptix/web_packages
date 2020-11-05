import { Injectable, NgModule }  from '@angular/core';
import { CommonModule }          from '@angular/common';
import { BrowserModule }         from '@angular/platform-browser';
import {
    Router, Resolve,
    RouterModule, Routes
}                                from '@angular/router';
import { FormsModule }           from '@angular/forms';
import { NgbModule }             from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule }       from '@ngx-translate/core';
import { DeviceDetectorService } from 'ngx-device-detector';
import { EMPTY as empty }        from 'rxjs';

import { ComponentsModule }      from '../../components/components.module';
import { DirectivesModule }      from '../../directives/directives.module';
import { DownloadComponent }     from './download.component';
import { NxConfigService }       from '../../services/nx-config';

@Injectable()
export class OsResolver implements Resolve<any> {
    deviceInfo;
    platform: string;
    platformMatch: {};
    windows: string;

    constructor(private configService: NxConfigService,
                private router: Router,
                private deviceService: DeviceDetectorService) {
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

const appRoutes: Routes = [
    // {path: 'downloads', component: DownloadComponent},
    // {path: '', redirectTo: 'download', pathMatch: 'full'},
    { path: 'download', component: DownloadComponent, resolve: { platform: OsResolver } },
    { path: 'download/:platform', component: DownloadComponent }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        NgbModule,
        FormsModule,
        TranslateModule,
        ComponentsModule,
        DirectivesModule,
        RouterModule.forChild(appRoutes)
    ],
    providers: [
        OsResolver
    ],
    declarations: [
        DownloadComponent
    ],
    bootstrap : [],
    exports: [
        DownloadComponent
    ]
})
export class DownloadModule {
}
