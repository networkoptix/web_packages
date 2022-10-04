import { isPlatformBrowser } from '@angular/common';
import {
    Component,
    OnInit,
    Inject,
    PLATFORM_ID
} from '@angular/core';
import {
    ActivatedRoute,
    ActivationEnd,
    Router
} from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { startCase } from 'lodash-es';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxAccountService } from '@services/account.service';
import { isAccount } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { BuildHistory, Build, Downloads } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxUriService } from '@services/uri.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-download-history',
    templateUrl: 'download-history.component.html',
    styleUrls: ['download-history.component.scss']
})

export class DownloadHistoryComponent implements OnInit {
    private sub: Subscription;
    readonly releases = 'releases';

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

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
        language: NxLanguageProviderService,
        private cloudApiService: NxCloudApiService,
        private accountService: NxAccountService,
        private route: ActivatedRoute,
        private router: Router,
        private pageService: NxPageService,
        private uriService: NxUriService,
        @Inject(PLATFORM_ID) private platformId: object
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        if (isPlatformBrowser(this.platformId)) {
            this.router.events
                .pipe(
                    untilDestroyed(this),
                    filter(event => event instanceof ActivationEnd)
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
    // doesn't acually check object contents
    private isSingleBuild(_data: BuildHistory | Build): _data is Build {
        return !!this.build;
    }

    private getData(): void {
        this.cloudApiService
            .getDownloadsHistory(this.build)
            .then(data => {
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

                this.pageService.pageTitle = startCase(this.currentTab || this.noteTypes[0]);

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

    public switchTo(name: string): false {
        this.currentTab = name;
        this.activeBuilds = this.downloadsData[name];
        this.pageService.pageTitle = startCase(name);

        this.uriService
            .updateURI('/downloads/' + name, {})
            .catch(error => {
                console.error(error);
            });
        return false;
    }
}
