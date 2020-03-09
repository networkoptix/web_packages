import {
    Component, OnInit, OnDestroy,
    ViewChild, Inject, PLATFORM_ID
} from '@angular/core';
import { ActivatedRoute, ActivationEnd, Router }                from '@angular/router';
import { DOCUMENT, isPlatformBrowser, Location, TitleCasePipe } from '@angular/common';
import { isNumeric }                                            from 'rxjs/util/isNumeric';
import { NgbTabChangeEvent, NgbTabset }                         from '@ng-bootstrap/ng-bootstrap';

import isArray = require('core-js/features/array/is-array');
import angular = require('angular');
import { NxConfigService, IConfig }                                      from '../../services/nx-config';
import { NxLanguageProviderService }                            from '../../services/nx-language-provider';
import { NxAccountService }                                     from '../../services/account.service';
import { NxCloudApiService }                                    from '../../services/nx-cloud-api';
import { NxUriService }                                         from '../../services/uri.service';
import { filter }                                               from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { NxPageService } from '../../services/page.service';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector   : 'download-history',
    templateUrl: 'download-history.component.html',
    styleUrls  : [ 'download-history.component.scss' ]
})

export class DownloadHistoryComponent implements OnInit, OnDestroy {
    private sub: any;
    private build: any;
    private canViewRelease: boolean;
    readonly releases = 'releases';

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    tabsVisible: boolean;
    routeParam: any;
    section: any;
    user: any;
    downloads: any;
    activeBuilds: any;
    downloadsData: any;
    noteTypes: any;
    linkbase: any;
    private routerSubscription: Subscription;

    @ViewChild('tabs', { static: false })
    public tabs: NgbTabset;

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.getTranslations();
        this.tabsVisible = false;
        this.canViewRelease = false;
        this.noteTypes = [];
    }

    constructor(configService: NxConfigService,
                @Inject(DOCUMENT) private document: any,
                private cloudApiService: NxCloudApiService,
                private accountService: NxAccountService,
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
            this.routerSubscription = this.router.events
                .pipe(
                    filter(event => event instanceof ActivationEnd)
                )
                .subscribe((event: ActivationEnd) => {
                    if (this.tabs && event.snapshot.params.type) {
                        this.tabs.select(event.snapshot.params.type);
                    }
                });
        }
    }

    private getAvailableDownloadTypes(data) {
        this.noteTypes = [];
        angular.forEach(data, (noteType, name) => {
            if (isArray(noteType) && noteType.length) {
                this.noteTypes.push(name);
            }
        });

        // re-order tabs
        if (this.noteTypes.length) {
            this.noteTypes = this.noteTypes.reverse();
        }
    }

    private getData() {
        const data = this.cloudApiService
            .getDownloadsHistory(this.build)
            .then((data: any) => {
                    this.linkbase = data.updatesPrefix;
                    if (!this.build) { // only one build
                        this.downloadsData = data;
                        if (!(this.section in this.downloadsData)) {
                            this.section = this.releases;
                        }
                        this.activeBuilds = this.downloadsData[ this.section ];
                        this.getAvailableDownloadTypes(this.downloadsData);
                    } else {
                        this.activeBuilds = [ data ];
                        this.noteTypes = [ data.type ];
                        this.downloadsData = {};
                        this.downloadsData[ data.type ] = this.activeBuilds;
                    }

                    this.pageService.setPageTitle(new TitleCasePipe().transform(this.noteTypes[ 0 ])); // this.downloadTypes[ 0 ][ 0 ].toUpperCase() + this.downloadTypes[ 0 ].substr(1).toLowerCase());

                    setTimeout(() => {
                        this.tabsVisible = true;
                        if (this.tabs) {
                            this.tabs.select(this.section);
                        }
                    });

                }, () => {
                    this.router.navigate([this.CONFIG.redirect.page404]);
                }
            )
            .finally(() => {
                this.sub.unsubscribe();
            });
    }

    public beforeChange($event: NgbTabChangeEvent) {
        this.activeBuilds = this.downloadsData[ $event.nextId ];
        this.pageService.setPageTitle(new TitleCasePipe().transform($event.nextId));
        this.uriService.updateURI('/downloads/' + $event.nextId, {});
    }

    ngOnInit(): void {
        this.sub = this.route.params.subscribe(params => {
            this.routeParam = params.type;

            this.routeParam = this.routeParam || this.releases;
            if (isNumeric(this.routeParam)) {
                this.build = this.routeParam;
            } else {
                this.section = this.routeParam;
            }

            if (!this.CONFIG.cloudCapabilities.publicReleases) {
                this.accountService
                    .requireLogin()
                    .then(account => {
                        this.canViewRelease = account && (account.is_superuser || account.permissions.indexOf(this.CONFIG.permissions.canViewRelease) > -1);

                        if (this.canViewRelease) {
                            this.getData();
                        } else {
                            this.router.navigate([this.CONFIG.redirect.page404]);
                            return;
                        }
                    });
            } else {
                this.canViewRelease = true;
                this.getData();
            }
        });
    }

    ngOnDestroy() {}
}

