import {
    Component, OnInit, OnDestroy,
    ViewChild, Inject, Input, PLATFORM_ID
}                                       from '@angular/core';
import {
    ActivatedRoute, ActivationEnd, Router
}                                       from '@angular/router';
import { isPlatformBrowser, Location }  from '@angular/common';
import { filter }                       from 'rxjs/operators';
import { NgbTabChangeEvent, NgbTabset } from '@ng-bootstrap/ng-bootstrap';
import { DeviceDetectorService }        from 'ngx-device-detector';
import { NxLanguageProviderService }    from '../../services/nx-language-provider';
import { NxConfigService, IConfig }     from '../../services/nx-config';
import { NxAccountService }             from '../../services/account.service';
import { NxPageService }                from '../../services/page.service';
import { NxCloudApiService }            from '../../services/nx-cloud-api';
import { NxUriService }                 from '../../services/uri.service';
import { LanguageI18NStaticTypes }      from '../../../language_i18n_static_types';
import { Subscription }                 from 'rxjs';
import { AutoUnsubscribe }              from 'ngx-auto-unsubscribe';

@AutoUnsubscribe()
@Component({
    selector   : 'download-component',
    templateUrl: 'download.component.html',
    styleUrls  : [ 'download.component.scss' ]
})

export class DownloadComponent implements OnInit, OnDestroy {
    @Input() routeParamPlatform;

    private sub: Subscription;
    private platform: any;
    private activeOs: string;
    public canViewDownloads: boolean;
    private paramPlatform: string;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    downloadButton: any;
    downloads: any;
    downloadsData: any;
    canSeeHistory: boolean;
    tabsVisible: boolean;
    activeTab: string;
    sortedPlatforms: any;
    otherPackages: any;
    private routerSubscription: Subscription;

    @ViewChild('tabs', { static: false })
    public tabs: NgbTabset;

    // TODO: Fix arm supported. It says the same thing as linux

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.getTranslations();

        this.canViewDownloads = false;
        this.tabsVisible = false;
        this.downloads = {... this.CONFIG.downloads};

        this.downloadsData = {
            version   : '',
            installers: [ { platform: '', appType: '' } ],
            releaseUrl: ''
        };

        this.sortedPlatforms = [];
    }

    constructor(configService: NxConfigService,
                private cloudApi: NxCloudApiService,
                private accountService: NxAccountService,
                private deviceService: DeviceDetectorService,
                private route: ActivatedRoute,
                private router: Router,
                private pageService: NxPageService,
                private language: NxLanguageProviderService,
                private uriService: NxUriService,
                private location: Location,
                @Inject(PLATFORM_ID) private platformId: object,
    ) {
        this.setupDefaults(configService);

        if (isPlatformBrowser(this.platformId)) {
            this.routerSubscription = this.router
                .events
                .pipe(
                    filter(event => event instanceof ActivationEnd)
                )
                .subscribe((event: ActivationEnd) => {
                    this.paramPlatform = event.snapshot.params.platform;
                    if (this.tabs && this.paramPlatform) {
                        this.tabs.select(this.paramPlatform);
                    }
                });
        }
    }

    public beforeChange($event: NgbTabChangeEvent) {
        this.setTitle($event.nextId);
        this.activeTab = $event.nextId;
        this.calcDisplayedPackages(this.activeTab);

        this.uriService
            .updateURI('/download/' + $event.nextId, {})
            .catch(error => {
                console.error(error);
            });
    }

    private calcDisplayedPackages(platformName) {
        const platform = this.sortedPlatforms.find(platform => platform.name === platformName);
        this.downloadButton = undefined;
        this.otherPackages = [];
        if (platform !== 'undefined') {
            if (platform.name === 'sdk') {
                this.otherPackages = platform.files;
            } else {
                this.downloadButton = platform.files[0];
                this.otherPackages = platform.files.slice(1);
            }
        }
    }

    private getDownloads() {
        this.sub = this.route.params.subscribe(params => {
            this.platform = params.platform.toLowerCase();

            for (const mobile in this.downloads.mobile) {
                if (this.downloads.mobile[ mobile ].os === this.activeOs) {
                    if (this.LANG.downloads.mobile[ this.downloads.mobile[ mobile ].name ].link !== 'disabled') {
                        document.location.href = this.LANG.downloads.mobile[ this.downloads.mobile[ mobile ].name ].link;
                        return;
                    }
                    break;
                }
            }
        });

        this.cloudApi
            .getDownloads()
            .then((response: any) => {
                this.downloadsData = response;
                // Sorts platforms based on order defined in nx-config service
                Object.keys(this.CONFIG.downloads.groups).forEach((key) => {
                    const checkPlatform = this.CONFIG.downloads.groups[key];
                    const platform = this.downloadsData.platforms.find((downloadsPlatform) => {
                        return downloadsPlatform.name === checkPlatform.name;
                    });
                    if (platform) {
                        platform.files = platform.files.filter((installer) => {
                            return this.downloads.groups[platform.name].appTypes.includes(installer.appType);
                        }).map((installer) => {
                            if (!installer.niceName) {
                                const translatedPlatform = this.LANG.downloads.platforms[installer.platform];
                                const translatedAppType = this.LANG.downloads.appTypes[installer.appType];
                                if (platform.name === 'sdk' && translatedAppType) {
                                    installer.niceName = translatedAppType;
                                } else if (translatedPlatform && translatedAppType) {
                                    installer.niceName = `${translatedPlatform} - ${translatedAppType}`;
                                } else {
                                    installer.niceName = `${installer.platform} - ${this.LANG.downloads.appTypes.package}`;
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
                this.setTitle(this.platform);

                setTimeout(() => {
                    this.tabsVisible = true;
                    if (this.tabs) {
                        this.tabs.select(this.platform.toLowerCase());
                    }
                });

                this.sub.unsubscribe();
            });
    }

    setTitle(platform) {
        let title;
        if (platform) {
            title = this.LANG.pageTitles.downloadPlatform + platform;
        } else {
            title = this.LANG.pageTitles.download;
        }
        this.pageService.setPageTitle(title);
    }

    ngOnInit(): void {
        this.accountService
            .get()
            .then(account => {
                this.canSeeHistory = (!!this.CONFIG.cloudCapabilities.publicReleases ||
                        account &&
                        (account.is_superuser ||
                        account.permissions.indexOf(this.CONFIG.permissions.canViewRelease) > -1));
            });

        if (!this.CONFIG.cloudCapabilities.publicDownloads) {
            this.setTitle(this.paramPlatform);

            this.accountService
                .requireLogin()
                .then(result => {
                    if (!result) {
                        this.router
                            .navigate([this.CONFIG.redirect.unauthorised])
                            .catch(error => {
                                console.error(error);
                            });
                        return;
                    } else if (result === 'register') {
                        return;
                    }

                    this.canViewDownloads = true;
                    this.getDownloads();
                });
        } else {
            this.canViewDownloads = true;
            this.getDownloads();
        }
    }

    ngOnDestroy() {}
}
