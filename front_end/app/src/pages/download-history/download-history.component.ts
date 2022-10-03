import { isPlatformBrowser, TitleCasePipe } from '@angular/common';
import {
    Component,
    OnInit,
    OnDestroy,
    Inject,
    PLATFORM_ID
} from '@angular/core';
import {
    ActivatedRoute,
    ActivationEnd,
    Router
} from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import * as isArray from 'core-js/features/array/is-array';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxAccountService, isAccount } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxUriService } from '@services/uri.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'download-history',
    templateUrl: 'download-history.component.html',
    styleUrls: ['download-history.component.scss']
})

export class DownloadHistoryComponent implements OnInit, OnDestroy {
    private sub;
    readonly releases = 'releases';

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    build;
    canViewRelease: boolean;
    tabsVisible: boolean;
    routeParam;
    section;
    user;
    downloads;
    activeBuilds;
    downloadsData;
    noteTypes;
    linkbase;
    private routerSubscription: Subscription;

    currentTab: string;

    private setupDefaults() {
        this.tabsVisible = false;
        this.canViewRelease = false;
        this.noteTypes = [];
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private cloudApiService: NxCloudApiService,
        private accountService: NxAccountService,
        private route: ActivatedRoute,
        private router: Router,
        private pageService: NxPageService,
        private uriService: NxUriService,
        @Inject(PLATFORM_ID) private platformId: object
    ) {
        this.setupDefaults();
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        if (isPlatformBrowser(this.platformId)) {
            this.routerSubscription = this.router.events
                .pipe(
                    filter(event => event instanceof ActivationEnd)
                )
                .subscribe((event: ActivationEnd) => {
                    if (event.snapshot.params.type) {
                        this.currentTab = event.snapshot.params.type;
                    }
                });
        }
    }

    private getAvailableDownloadTypes(data) {
        this.noteTypes = Object.keys(data || {}).filter((noteType) => {
            return isArray(data[noteType]) && data[noteType].length;
        }).reverse();
    }

    private getData() {
        this.cloudApiService
            .getDownloadsHistory(this.build)
            .then((data: any) => {
                this.linkbase = data.updatesPrefix;
                if (!this.build) { // only one build
                    this.downloadsData = data;
                    if (!(this.section in this.downloadsData)) {
                        this.section = this.releases;
                    }
                    this.activeBuilds = this.downloadsData[this.section];
                    this.getAvailableDownloadTypes(this.downloadsData);
                } else {
                    this.activeBuilds = [data];
                    this.noteTypes = [data.type];
                    this.downloadsData = {};
                    this.downloadsData[data.type] = this.activeBuilds;
                }

                this.pageService.pageTitle = new TitleCasePipe().transform(this.currentTab || this.noteTypes[0]);

                setTimeout(() => {
                    this.tabsVisible = true;
                });
            }, this.pageService.show404
            )
            .finally(() => {
                this.sub.unsubscribe();
            });
    }

    ngOnInit(): void {
        this.sub = this.route.params.subscribe(params => {
            this.routeParam = params.type;

            this.routeParam = this.routeParam || this.releases;
            /*
                (?:(?:\d*\.){2,3})?\d+(?: \w\d+)?
                This pattern looks for version, build, and in some cases R|H + number
                looks for the following patterns
                12345            - Build number (old way the rest are new)
                20.1.12345       - Mobile build with full version
                20.1.1.12345     - Desktop build with full version
                12345 R10        - Meta build with release
                20.1.12345 R10   - Mobile meta build with release
                20.1.1.12345 R10 - Desktop Meta build with release
             */
            if (/(?:(?:\d*\.){2,3})?\d+(?: \w\d+)?/.test(this.routeParam)) {
                this.build = this.routeParam;
            } else {
                this.section = this.routeParam;
            }

            if (!this.CONFIG.cloudCapabilities.publicReleases) {
                this.accountService
                    .requireLogin()
                    .then(account => {
                        this.canViewRelease = isAccount(account) && (
                            account.is_superuser ||
                            account.permissions.includes(
                                this.CONFIG.permissions.canViewRelease
                            )
                        );

                        if (this.canViewRelease) {
                            this.getData();
                        } else {
                            this.pageService.show404();
                        }
                    });
            } else {
                this.canViewRelease = true;
                if (this.build === undefined) {
                    this.getData();
                } else {
                    this.accountService.requireLogin().then(account => {
                        if (isAccount(account)) {
                            this.getData();
                        }
                    });
                }
            }
        });
    }

    public switchTo(name: string) {
        this.currentTab = name;
        this.activeBuilds = this.downloadsData[name];
        this.pageService.pageTitle = new TitleCasePipe().transform(name);

        this.uriService
            .updateURI('/downloads/' + name, {})
            .catch(error => {
                console.error(error);
            });
        return false;
    }

    ngOnDestroy() {}
}
