import { Injectable, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, RouterModule, Routes } from '@angular/router';

import { DownloadGuard } from '@guards/downloadGuard';
import { ReleaseGuard } from '@guards/releaseGuard';
import { DownloadComponent } from '@pages/download-updated/download/download-component.component';
import { DownloadHistoryComponent } from '@pages/download-updated/download-history/download-history-component.component';
import { DownloadDataReleaseTypeResolver } from '@resolvers/download-data-release-type-resolver';
import { DownloadHistoryResolver } from '@resolvers/download-history-resolver';
import { DownloadsDataResolver } from '@resolvers/downloads-data-resolver';
import { SortedPlatformsResolver } from '@resolvers/sorted-platforms-resolver';

import { NxDownloadsReleasesComponentNew } from './downloads-releases/downloads-releases.component';

@Injectable({ providedIn: 'root' })
class TitleResolver {
    resolve(route: ActivatedRouteSnapshot): string {
        const { platform } = route.params;
        if (platform && platform !== 'sdk') {
            return `
                {
                    "baseTitle": "downloadPlatform",
                    "modifier": "${platform}"
                }
            `;
        }
        return 'download';
    }
}

const appRoutes: Routes = [
    {
        path: '',
        component: NxDownloadsReleasesComponentNew,
        resolve: {
            downloadData: DownloadsDataResolver,
        },
        children: [
            {
                path: 'other/:type',
                title: TitleResolver,
                canActivate: [ReleaseGuard],
                component: DownloadHistoryComponent,
                resolve: {
                    downloadsData: DownloadHistoryResolver,
                },
            },
            {
                path: ':releaseType/:platform',
                title: TitleResolver,
                canActivate: [DownloadGuard],
                component: DownloadComponent,
                resolve: {
                    downloadData: DownloadDataReleaseTypeResolver,
                    sortedPlatforms: SortedPlatformsResolver,
                },
            },
            {
                path: '**',
                redirectTo: 'releases/',
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(appRoutes)],
})
export class NxDownloadsReleasesModuleNew {}
