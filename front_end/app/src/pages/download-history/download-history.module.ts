import { Injectable, NgModule }                  from '@angular/core';
import { CommonModule }                          from '@angular/common';
import { BrowserModule }                         from '@angular/platform-browser';
import { UpgradeModule }                         from '@angular/upgrade/static';
import { Resolve, Router, RouterModule, Routes } from '@angular/router';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { ComponentsModule }         from '../../components/components.module';
import { ReleaseComponent }         from './release/release.component';
import { DownloadHistoryComponent } from './download-history.component';
import { TranslateModule }          from '@ngx-translate/core';
import { DeviceDetectorService }    from 'ngx-device-detector';
import { EMPTY as empty }           from 'rxjs';

@Injectable()
export class TypeResolver implements Resolve<any> {
    constructor(private router: Router) {
    }

    resolve() {
        this.router
            .navigate(['/downloads/releases'])
            .catch(error => {
                console.error(error);
            });
        return empty;
    }
}

const appRoutes: Routes = [
    // { path: '', redirectTo: 'download', pathMatch: 'full' },
    { path: 'downloads/history', component: DownloadHistoryComponent, resolve: { type: TypeResolver }},
    { path: 'downloads/:type', component: DownloadHistoryComponent }
];

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        UpgradeModule,
        NgbModule,
        TranslateModule,

        ComponentsModule,
        RouterModule.forChild(appRoutes),
    ],
    providers: [
        TypeResolver,
    ],
    declarations: [
        DownloadHistoryComponent,
        ReleaseComponent
    ],
    bootstrap: [],
    entryComponents: [
        DownloadHistoryComponent
    ],
    exports: [
        DownloadHistoryComponent
    ]
})
export class DownloadHistoryModule {
}
