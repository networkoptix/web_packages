import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, ActivationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { images } from '@lib/variables/static-variables';
import { permissions } from '@pages/static-variables-features';
import { NxAccountService } from '@services/account.service';
import { isAccount } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { Downloads, Installer, Platform } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { Arm, Groups } from '@services/nx-config/base-config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
// import { NxPageService } from '@services/page.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-download-component',
    templateUrl: 'download.component.html',
    styleUrls: ['download.component.scss'],
})
export class DownloadComponent implements OnInit {
    private sub: Subscription;
    private platform: string;
    private activeOs: string;
    public canViewDownloads: boolean = false;
    private paramPlatform: string;

    CONFIG: IConfig;
    LANG = staticLang;
    images = images;

    activePlatform: Platform;

    downloadButton: Installer;
    downloadsData: Downloads | null;
    canSeeHistory: boolean;
    tabsVisible: boolean = false;
    sortedPlatforms: Platform[];
    checkedDownloads: boolean = false;
    // Placeholder should not appear while downloads are loading
    otherPackages: Installer[];

    // TODO: Fix arm supported. It says the same thing as linux

    constructor(
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private accountService: NxAccountService,
        private deviceService: DeviceDetectorService,
        private route: ActivatedRoute,
        private router: Router,
        // private pageService: NxPageService,
        @Inject(PLATFORM_ID) private platformId: object,
        @Inject(DOCUMENT) private document: Document,
    ) {
        this.CONFIG = configService.getConfig();

        if (isPlatformBrowser(this.platformId)) {
            this.router.events
                .pipe(
                    untilDestroyed(this),
                    filter(event => event instanceof ActivationEnd),
                )
                .subscribe((event: ActivationEnd) => {
                    this.paramPlatform = event.snapshot.params.platform;

                    if (this.paramPlatform && this.sortedPlatforms?.length) {
                        this.calcDisplayedPackages(this.paramPlatform);
                        this.activePlatform = this.sortedPlatforms.find(
                            platform => platform.name === this.paramPlatform,
                        );
                    }
                    // }
                });
        }
    }

    private calcDisplayedPackages(platformName: string): void {
        const platform = this.sortedPlatforms.find(platform => platform.name === platformName);
        this.downloadButton = undefined;
        this.otherPackages = [];
        if (platform !== undefined) {
            if (platform.name === 'sdk') {
                this.otherPackages = platform.files;
            } else {
                // Ensures the first client found is always selected for the download button.
                const client = platform.files.find(({ appType }) => appType === 'client');
                this.downloadButton = client;
                // Remove the download button from the other packages.
                this.otherPackages = platform.files.filter(
                    ({ fileName }) => fileName !== client.fileName,
                );
            }
        }
    }

    private getDownloads(): void {
        this.sub = this.route.params.subscribe(params => {
            this.platform = params.platform.toLowerCase();

            for (const mobile in this.CONFIG.downloads.mobile) {
                const { name, os } = this.CONFIG.downloads.mobile[mobile];
                if (os === this.activeOs) {
                    const link = this.LANG.downloads.mobile[name].link;
                    if (link !== 'disabled') {
                        this.document.location.href = link;
                        return;
                    }
                    break;
                }
            }
        });

        this.cloudApi.getDownloads().then(response => {
            // Response is null if no releases
            this.downloadsData = response;
            this.sortedPlatforms = [];
            // Sorts platforms based on order defined in nx-config service
            Object.values(this.CONFIG.downloads.groups).forEach((checkPlatform: Arm) => {
                const platform = this.downloadsData?.platforms.find(
                    downloadsPlatform => downloadsPlatform.name === checkPlatform.name,
                );
                if (!platform) {
                    return;
                }
                platform.files = platform.files
                    .filter(installer =>
                        this.CONFIG.downloads.groups[
                            platform.name as keyof Groups
                        ].appTypes.includes(installer.appType),
                    )
                    .map(installer => {
                        if (!installer.niceName) {
                            const translatedPlatform =
                                this.LANG.downloads.platforms[installer.platform];
                            const translatedAppType =
                                this.LANG.downloads.appTypes[installer.appType];
                            if (platform.name === 'sdk' && translatedAppType) {
                                installer.niceName = translatedAppType;
                            } else if (translatedPlatform && translatedAppType) {
                                installer.niceName = `${translatedPlatform} - ${translatedAppType}`;
                            } else {
                                installer.niceName = `${installer.platform} - ${this.LANG.downloads.appTypes.package}`;
                            }
                        }
                        return installer;
                    });

                if (platform.files.length > 0) {
                    this.sortedPlatforms.push(platform);
                }
            });

            if (!this.sortedPlatforms.some(platform => platform.name === this.platform)) {
                const configDownloads = this.CONFIG.downloads;
                const detectedOS = this.deviceService.getDeviceInfo().os.toLowerCase();
                this.platform =
                    configDownloads.platformMatch[detectedOS] ||
                    configDownloads.groups.windows.name;
            }
            this.calcDisplayedPackages(this.platform);
            this.activePlatform = this.sortedPlatforms.find(
                platform => platform.name === this.platform,
            );
            this.checkedDownloads = true;

            this.sub.unsubscribe();
        });
    }

    ngOnInit(): void {
        this.accountService.get().then(account => {
            this.canSeeHistory =
                !!this.CONFIG.cloudCapabilities.publicReleases ||
                (account &&
                    (account.is_superuser ||
                        account.permissions.includes(permissions.canViewRelease)));
        });

        if (!this.CONFIG.cloudCapabilities.publicDownloads) {
            this.accountService.requireLogin().then(result => {
                if (isAccount(result)) {
                    this.canViewDownloads = true;
                    this.getDownloads();
                }
            });
        } else {
            this.canViewDownloads = true;
            this.getDownloads();
        }
    }

    installerName(platformName: string): string {
        return (
            this.LANG.downloads.groups[platformName].shortLabel ||
            this.LANG.downloads.groups[platformName].label
        );
    }
}
