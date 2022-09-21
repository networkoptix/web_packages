import { isPlatformBrowser } from '@angular/common';
import {
    Component,
    OnInit,
    OnDestroy,
    Inject,
    Input,
    PLATFORM_ID
} from '@angular/core';
import {
    ActivatedRoute,
    ActivationEnd,
    Router
} from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxAccountService } from '@services/account.service';
import { isAccount } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-download-component',
    templateUrl: 'download.component.html',
    styleUrls: ['download.component.scss']
})

export class DownloadComponent implements OnInit, OnDestroy {
    @Input() routeParamPlatform;

    private sub: Subscription;
    private platform;
    private activeOs: string;
    public canViewDownloads: boolean;
    private paramPlatform: string;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    activePlatform: any;

    downloadButton;
    downloads;
    downloadsData;
    canSeeHistory: boolean;
    tabsVisible: boolean;
    sortedPlatforms;
    checkedDownloads = false;
    // Placeholder should not appear while downloads are loading
    otherPackages;

    // TODO: Fix arm supported. It says the same thing as linux

    private setupDefaults(): void {
        this.canViewDownloads = false;
        this.tabsVisible = false;
        this.downloads = { ...this.CONFIG.downloads };

        this.downloadsData = {
            version: '',
            installers: [{ platform: '', appType: '' }],
            releaseUrl: ''
        };
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private cloudApi: NxCloudApiService,
        private accountService: NxAccountService,
        private deviceService: DeviceDetectorService,
        private route: ActivatedRoute,
        private router: Router,
        private pageService: NxPageService,
        @Inject(PLATFORM_ID) private platformId: object
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();

        if (isPlatformBrowser(this.platformId)) {
            this.router.events
                .pipe(
                    untilDestroyed(this),
                    filter(event => event instanceof ActivationEnd)
                )
                .subscribe((event: ActivationEnd) => {
                    this.paramPlatform = event.snapshot.params.platform;

                    if (this.paramPlatform) {
                        let title;
                        if (this.paramPlatform) {
                            title = this.LANG.pageTitles.downloadPlatform() +
                                this.paramPlatform;
                        } else {
                            title = this.LANG.pageTitles.download();
                        }
                        this.pageService.pageTitle = title;

                        if (this.sortedPlatforms?.length) {
                            this.calcDisplayedPackages(this.paramPlatform);
                            this.activePlatform = this.sortedPlatforms.find(
                                platform => platform.name === this.paramPlatform
                            );
                        }
                    }
                });
        }
    }

    private calcDisplayedPackages(platformName): void {
        const platform = this.sortedPlatforms.find(platform =>
            platform.name === platformName
        );
        this.downloadButton = undefined;
        this.otherPackages = [];
        if (platform !== undefined) {
            if (platform.name === 'sdk') {
                this.otherPackages = platform.files;
            } else {
                // Ensures the first client found is always selected for the download button.
                const client = platform.files.find(({ appType }) =>
                    appType === 'client'
                );
                this.downloadButton = client;
                // Remove the download button from the other packages.
                this.otherPackages = platform.files.filter(({ fileName }) =>
                    fileName !== client.fileName
                );
            }
        }
    }

    private getDownloads(): void {
        this.sub = this.route.params.subscribe(params => {
            this.platform = params.platform.toLowerCase();

            for (const mobile in this.downloads.mobile) {
                if (this.downloads.mobile[mobile].os === this.activeOs) {
                    if (
                        this.LANG.downloads.mobile[
                            this.downloads.mobile[mobile].name
                        ].link() !== 'disabled'
                    ) {
                        document.location.href = this.LANG.downloads.mobile[
                            this.downloads.mobile[mobile].name
                        ].link();
                        return;
                    }
                    break;
                }
            }
        });

        this.cloudApi
            .getDownloads()
            .then((response: any) => {
                // Response is null if no releases
                this.downloadsData = response;
                this.sortedPlatforms = [];
                // Sorts platforms based on order defined in nx-config service
                Object.values(this.CONFIG.downloads.groups).forEach(checkPlatform => {
                    const platform = this.downloadsData?.platforms.find(
                        downloadsPlatform => downloadsPlatform.name === checkPlatform.name
                    );
                    if (platform) {
                        platform.files = platform.files.filter(installer => {
                            return this.downloads.groups[platform.name].appTypes.includes(installer.appType);
                        }).map(installer => {
                            if (!installer.niceName) {
                                const translatedPlatform = this.LANG.downloads.platforms[installer.platform]();
                                const translatedAppType = this.LANG.downloads.appTypes[installer.appType]();
                                if (platform.name === 'sdk' && translatedAppType) {
                                    installer.niceName = translatedAppType;
                                } else if (translatedPlatform && translatedAppType) {
                                    installer.niceName = `${translatedPlatform} - ${translatedAppType}`;
                                } else {
                                    installer.niceName = `${installer.platform} - ${this.LANG.downloads.appTypes.package()}`;
                                }
                            }
                            installer.url = `${this.downloadsData.releaseUrl}${installer.path}`;
                            return installer;
                        });

                        if (platform.files.length > 0) {
                            this.sortedPlatforms.push(platform);
                        }
                    }
                });

                if (!this.sortedPlatforms.some(platform => platform.name === this.platform)) {
                    const configDownloads = this.CONFIG.downloads;
                    const detectedOS = this.deviceService.getDeviceInfo().os.toLowerCase();
                    this.platform = configDownloads.platformMatch[detectedOS] || configDownloads.groups.windows.name;
                }
                this.calcDisplayedPackages(this.platform);
                this.activePlatform = this.sortedPlatforms.find(platform => platform.name === this.platform);
                this.checkedDownloads = true;

                this.sub.unsubscribe();
            });
    }

    ngOnInit(): void {
        const account = this.accountService.accountSubject.getValue();
        this.canSeeHistory = (
            !!this.CONFIG.cloudCapabilities.publicReleases ||
            account && (
                account.is_superuser ||
                account.permissions.includes(
                    this.CONFIG.permissions.canViewRelease
                )
            )
        );

        if (!this.CONFIG.cloudCapabilities.publicDownloads) {
            this.accountService
                .requireLogin()
                .then(result => {
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

    ngOnDestroy(): void { }
}
