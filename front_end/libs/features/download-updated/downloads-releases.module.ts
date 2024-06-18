import { Injectable, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, RouterModule, Routes } from '@angular/router';

import { BackwardsCompatPlatformGuard } from '@guards/backwardsCompatPlatformGuard';
import { DownloadGuard } from '@guards/downloadGuard';
import { ReleaseGuard } from '@guards/releaseGuard';
import { DownloadComponent } from '@pages/download-updated/download/download-component.component';
import { DownloadHistoryComponent } from '@pages/download-updated/download-history/download-history-component.component';
import { DownloadDataReleaseTypeResolver } from '@resolvers/download-data-release-type-resolver';
import { DownloadHistoryResolver } from '@resolvers/download-history-resolver';
import { DownloadsDataResolver } from '@resolvers/downloads-data-resolver';
import { SortedPlatformsResolver } from '@resolvers/sorted-platforms-resolver';

import { NxDownloadsReleasesComponentNew } from './downloads-releases/downloads-releases.component';
import { DownloadsService } from './downloads.service';

@Injectable()
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
                path: ':platform',
                canActivate: [BackwardsCompatPlatformGuard],
                // This is here because something needs to be here. In A18 we can probably remove it in favor of a redirect method
                component: DownloadComponent,
            },
            {
                path: 'betas',
                redirectTo: 'betas/',
            },
            {
                path: '**',
                redirectTo: 'releases/',
            },
        ],
    },
];

@NgModule({
    providers: [TitleResolver, DownloadsService],
    imports: [RouterModule.forChild(appRoutes)],
})
export class NxDownloadsReleasesModuleNew {}
