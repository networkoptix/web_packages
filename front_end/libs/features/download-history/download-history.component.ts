import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, Inject, PLATFORM_ID, Injector } from '@angular/core';
import { ActivatedRoute, ActivationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { startCase } from 'lodash-es';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import staticLang from '@language_static';
import { permissions } from '@pages/static-variables-features';
import { NxAccountService } from '@services/account.service';
import { isAccount } from '@services/account.service/account';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { BuildHistory, Build, Downloads } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageService } from '@services/page.service';
import { NxUriService } from '@services/uri.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-download-history',
    templateUrl: 'download-history.component.html',
    styleUrls: ['download-history.component.scss'],
})
export class DownloadHistoryComponent implements OnInit {
    private sub: Subscription;
    readonly releases = 'releases';

    CONFIG: IConfig;
    LANG = staticLang;

    injector: Injector;
    build: string;
    canViewRelease: boolean = false;
    tabsVisible: boolean = false;
    routeParam: string;
    section: string;
    activeBuilds: Downloads[];
    downloadsData: Omit<BuildHistory, 'updatesPrefix'>;
    noteTypes: string[] = [];
    linkbase: string;

    currentTab: string;

    constructor(
        configService: NxConfigService,
        private cloudApiService: NxCloudApiService,
        private accountService: NxAccountService,
        private route: ActivatedRoute,
        private router: Router,
        private pageService: NxPageService,
        private uriService: NxUriService,
        public appStateService: NxAppStateService,
        @Inject(PLATFORM_ID) private platformId: object,
        injector: Injector,
    ) {
        this.CONFIG = configService.getConfig();

        this.injector = injector;

        if (isPlatformBrowser(this.platformId)) {
            this.router.events
                .pipe(
                    untilDestroyed(this),
                    filter(event => event instanceof ActivationEnd),
                )
                .subscribe((event: ActivationEnd) => {
                    if (event.snapshot.params.type) {
                        this.currentTab = event.snapshot.params.type;
                    }
                });
        }
    }

    private getAvailableDownloadTypes(data: BuildHistory): void {
        this.noteTypes = Object.keys(data || {})
            .filter(noteType => {
                return Array.isArray(data[noteType]) && data[noteType].length;
            })
            .reverse();
    }

    // Only for response from NxCloudApiService.getDownloadsHistory(this.build),
    // doesn't actually check object contents
    private isSingleBuild(_data: BuildHistory | Build): _data is Build {
        return !!this.build;
    }

    private getData(): void {
        this.cloudApiService
            .getDownloadsHistory(this.build)
            .then(
                data => {
                    this.linkbase = data.updatesPrefix;
                    if (!this.isSingleBuild(data)) {
                        this.downloadsData = data;
                        if (!(this.section in data)) {
                            this.section = this.releases;
                        }
                        this.activeBuilds = data[this.section];
                        this.getAvailableDownloadTypes(data);
                    } else {
                        this.activeBuilds = [data];
                        this.noteTypes = [data.type];
                        this.downloadsData = {
                            [data.type]: this.activeBuilds,
                        };
                    }

                    if (!this.currentTab && !this.build) {
                        this.pageService.pageTitle(startCase(this.noteTypes[0]));
                    }

                    setTimeout(() => {
                        this.tabsVisible = true;
                    });
                },
                () => {
                    this.injector.get(NxPageService).redirect404();
                },
            )
            .finally(() => {
                this.sub.unsubscribe();
            });
    }

    private getDataAuthorized(): void {
        this.accountService.requireLogin().then(account => {
            if (isAccount(account)) {
                this.getData();
            }
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
                if (this.build) {
                    this.canViewRelease = true;
                    return this.getData();
                }
                this.accountService.requireLogin().then(account => {
                    this.canViewRelease =
                        isAccount(account) &&
                        (account.is_superuser ||
                            account.permissions.includes(permissions.canViewRelease));

                    if (this.canViewRelease) {
                        this.getData();
                    } else {
                        this.injector.get(NxPageService).redirect404();
                    }
                });
            } else {
                this.appStateService.readySubject
                    .pipe(
                        filter(ready => ready),
                        take(1),
                    )
                    .subscribe(() => {
                        this.canViewRelease = true;
                        if (this.build === undefined) {
                            this.getData();
                        } else {
                            this.getDataAuthorized();
                        }
                    });
            }
        });
    }

    public switchTo(name: string): false {
        this.currentTab = name;
        this.activeBuilds = this.downloadsData[name];

        this.uriService.updateURI('/downloads/' + name, {}).catch(error => {
            console.error(error);
        });
        return false;
    }
}
