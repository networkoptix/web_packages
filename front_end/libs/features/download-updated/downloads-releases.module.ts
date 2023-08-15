import { inject, Injectable, NgModule } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    createUrlTreeFromSnapshot,
    ResolveFn,
    Router,
    RouterModule,
    RouterStateSnapshot,
    Routes,
} from '@angular/router';
import { DeviceDetectorService } from 'ngx-device-detector';
import { filter, take } from 'rxjs/operators';

import { DownloadComponentNew } from '@pages/download-updated/download/download-component-new.component';
import { DownloadHistoryComponentNew } from '@pages/download-updated/download-history/download-history-component-new.component';
import { permissions } from '@pages/static-variables-features';
import { NxAccountService } from '@services/account.service';
import { isAccount } from '@services/account.service/account';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import {
    Build,
    BuildHistory,
    DownloadReleases,
    Platform,
} from '@services/nx-cloud-api/nx-cloud-api.types';
import { Arm, Downloads } from '@services/nx-config/base-config';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { NxDownloadsReleasesComponentNew } from './downloads-releases/downloads-releases.component';

const ReleaseGuard: ResolveFn<boolean> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const CONFIG: IConfig = inject(NxConfigService).getConfig();
    const accountService = inject(NxAccountService);
    const appStateService = inject(NxAppStateService);
    let canViewRelease: boolean;
    let build: string;

    if (/(?:(?:\d*\.){2,3})?\d+(?: \w\d+)?/.test(route.params.type)) {
        build = route.params.type;
    }

    if (!CONFIG.cloudCapabilities.publicReleases) {
        if (build) {
            canViewRelease = true;
        }

        accountService.requireLogin().then(account => {
            canViewRelease =
                isAccount(account) &&
                (account.is_superuser || account.permissions.includes(permissions.canViewRelease));
        });
    } else if (appStateService.ready) {
        canViewRelease = true;
        if (build === undefined) {
            return true;
        } else {
            appStateService.readySubject
                .pipe(
                    filter(ready => ready),
                    take(1),
                )
                .subscribe(() => {
                    canViewRelease = true;
                });
        }
    }

    return canViewRelease;
};

const DownloadGuard: ResolveFn<boolean> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const CONFIG: IConfig = inject(NxConfigService).getConfig();
    const accountService = inject(NxAccountService);
    let canViewDownloads: boolean;

    if (!CONFIG.cloudCapabilities.publicDownloads) {
        accountService.requireLogin().then(result => {
            if (isAccount(result)) {
                canViewDownloads = true;
            }
        });
    } else {
        canViewDownloads = true;
    }
    return canViewDownloads;
};

const downloadDataReleaseTypeResolver: ResolveFn<Promise<Downloads>> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
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
            .navigate(['/downloads-releases/' + releaseType + '/' + fallbackPlatform])
            .catch(error => {
                console.error(error);
            });
    }

    const data = await inject(NxCloudApiService).getDownloadsReleases();
    if (releaseType === 'releases') {
        data[releaseType].platforms.push({ name: 'mobile', files: [] });
    }
    return data[releaseType];
};

const sortedPlatformsResolver: ResolveFn<Promise<Platform[]>> = async (
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

const downloadsDataResolver: ResolveFn<Promise<DownloadReleases>> = () =>
    inject(NxCloudApiService).getDownloadsReleases();

const downloadHistoryResolver: ResolveFn<Promise<BuildHistory | Build>> = async (
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const { build } = route.params;
    return inject(NxCloudApiService).getDownloadsHistory(build);
};

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
            downloadData: downloadsDataResolver,
        },
        children: [
            {
                path: 'other/:type',
                title: TitleResolver,
                canActivate: [ReleaseGuard],
                component: DownloadHistoryComponentNew,
                resolve: {
                    downloadsData: downloadHistoryResolver,
                },
            },
            {
                path: ':releaseType/:platform',
                title: TitleResolver,
                canActivate: [DownloadGuard],
                component: DownloadComponentNew,
                resolve: {
                    downloadData: downloadDataReleaseTypeResolver,
                    sortedPlatforms: sortedPlatformsResolver,
                },
            },
            {
                path: '**',
                redirectTo: 'releases/x',
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(appRoutes)],
})
export class NxDownloadsReleasesModuleNew {}
