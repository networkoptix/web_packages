import {
    Component, OnInit, OnDestroy,
    ViewChild, Inject, Input
}                                            from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { Title }                        from '@angular/platform-browser';
import { Location }           from '@angular/common';
import { NgbTabChangeEvent, NgbTabset } from '@ng-bootstrap/ng-bootstrap';
import { DeviceDetectorService }        from 'ngx-device-detector';
import { NxConfigService }              from '../../services/nx-config';
import { NxLanguageProviderService }    from '../../services/nx-language-provider';

@Component({
    selector   : 'download-component',
    templateUrl: 'download.component.html',
    styleUrls  : [ 'download.component.scss' ]
})

export class DownloadComponent implements OnInit, OnDestroy {
    @Input() routeParamPlatform;

    private sub: any;
    private platform: any;
    private activeOs: string;
    private routeData: any;
    private canViewDownloads: boolean;

    CONFIG: any;
    LANG: any;

    downloads: any;
    downloadsData: any;
    platformMatch: {};
    canSeeHistory: boolean;
    tabsVisible: boolean;
    sortedPlatforms: any;

    location: Location;

    @ViewChild('tabs', { static: true })
    public tabs: NgbTabset;

    // TODO: Fix arm supported. It says the same thing as linux

    private setupDefaults() {

        this.CONFIG = this.configService.getConfig();

        this.canViewDownloads = false;
        this.tabsVisible = false;
        this.downloads = {... this.CONFIG.downloads};

        this.downloadsData = {
            version   : '',
            installers: [ { platform: '', appType: '' } ],
            releaseUrl: ''
        };

        this.sortedPlatforms = [];

        this.platformMatch = {
            unix   : 'Linux',
            linux  : 'Linux',
            mac  : 'MacOS',
            windows: 'Windows',
            arm    : 'Arm',
            sdk    : 'SDK'
        };
    }

    constructor(@Inject('cloudApiService') private cloudApi: any,
                @Inject('account') private account: any,
                @Inject('authorizationCheckService') private authorizationService: any,
                @Inject('locationProxyService') private locationProxy: any,
                // @Inject(DOCUMENT) private document: Document,
                private configService: NxConfigService,
                private deviceService: DeviceDetectorService,
                private route: ActivatedRoute,
                private router: Router,
                private titleService: Title,
                private language: NxLanguageProviderService,
                location: Location) {

        this.location = location;
        this.setupDefaults();
    }

    private detectOS(): string {
        return this.platformMatch[this.deviceService.getDeviceInfo().os];
    }

    public beforeChange($event: NgbTabChangeEvent) {
        this.setTitle($event.nextId);
        this.locationProxy.path('/download/' + $event.nextId, false);
    }

    private getDownloads() {
        // TODO: Commented until we ged rid of AJS
        // this.routeData = this.route.snapshot.data;

        this.sub = this.route.params.subscribe(params => {
            // TODO: Commented until we ged rid of AJS
            // this.platform = params['platform'];
            this.routeParamPlatform = this.routeParamPlatform && this.routeParamPlatform.toLowerCase();
            this.platform = (this.routeParamPlatform in this.platformMatch ? this.platformMatch[this.routeParamPlatform] : this.detectOS()).toLowerCase();

            // TODO: Commented until we ged rid of AJS
            // this.activeOs = this.platform || this.platformMatch[this.routeData.platform.os];

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
            .then(data => {
                this.downloadsData = data.data;
                // Sorts platforms based on order defined in nx-config service
                Object.keys(this.CONFIG.downloads.groups).forEach((key) => {
                    const checkPlatform = this.CONFIG.downloads.groups[key];
                    const platform = this.downloadsData.platforms.find((downloadsPlatform) => {
                        return downloadsPlatform.name === checkPlatform.name;
                    });
                    if (platform) {
                        platform.files = platform.files.filter((installer) => {
                            switch (platform.name) {
                                case 'sdk':
                                    return installer.path.indexOf('sdk') > -1;
                                default:
                                    return this.downloads.groups[platform.name].appTypes.includes(installer.appType);
                            }
                        }).map((installer) => {
                            const translatedPlatform = this.LANG.downloads.platforms[installer.platform] || installer.platform;
                            const translatedAppType = this.LANG.downloads.appTypes[installer.appType] || this.LANG.downloads.appTypes.package;
                            installer.formatName = `${translatedPlatform} - ${translatedAppType}`;
                            installer.url = `${this.downloadsData.releaseUrl}${installer.path}`;
                            return installer;
                        });

                        if (platform.files.length > 0) {
                            this.sortedPlatforms.push(platform);
                        }
                    }
                });

                if (!this.sortedPlatforms.some(platform => platform.name === this.platform)) {
                    this.platform = this.detectOS();
                }

                this.setTitle(this.platform);

                setTimeout(() => {
                    this.tabsVisible = true;
                    if (this.tabs) {
                        this.tabs.select(this.platform);
                    }
                });
            });
    }

    setTitle(platform) {
        let title;
        if (platform) {
            title = this.LANG.pageTitles.downloadPlatform + platform;
        } else {
            title = this.LANG.pageTitles.download;
        }
        this.titleService.setTitle(title);
    }

    ngOnInit(): void {
        this.LANG = this.language.getTranslations();

        this.account
            .get()
            .then(result => {
                this.canSeeHistory = (this.CONFIG.publicReleases ||
                    result.is_superuser ||
                    result.permissions.indexOf(this.CONFIG.permissions.canViewRelease) > -1);
            });

        if (!this.CONFIG.publicDownloads) {
            this.authorizationService
                .requireLogin()
                .then(result => {
                    if (!result) {
                        document.location.href = this.CONFIG.redirectUnauthorised;
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

    ngOnDestroy() {
        this.sub.unsubscribe();
    }
}
