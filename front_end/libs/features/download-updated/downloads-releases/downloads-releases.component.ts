import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, Inject, PLATFORM_ID, effect } from '@angular/core';
import { ActivationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { filter } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { images, menus } from '@lib/variables/static-variables';
import { NxMenuService } from '@menu/menu.service';
import { Content } from '@menu/menu.types';
import { permissions } from '@pages/static-variables-features';
import { NxAccountService } from '@services/account.service';
import { isAccount } from '@services/account.service/account';
import type { Platform } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@UntilDestroy()
@Component({
    selector: 'nx-downloads-releases-component',
    templateUrl: 'downloads-releases.component.html',
    styleUrls: ['downloads-releases.component.scss'],
})
export class NxDownloadsReleasesComponent implements OnInit {
    public canViewDownloads: boolean = false;
    private paramPlatform: string;

    CONFIG: IConfig;
    LANG = staticLang;
    images = images;

    activePlatform: Platform;
    canSeeHistory: boolean;
    sortedPlatforms: Platform[];

    content: Content;

    public data: {
        releases: boolean;
        betas: boolean;
        patches: boolean;
        other: boolean;
    };

    constructor(
        configService: NxConfigService,
        private accountService: NxAccountService,
        private router: Router,
        private menuService: NxMenuService,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {
        this.CONFIG = configService.getConfig();
        this.data = {
            releases: true,
            betas: true,
            patches: true,
            other: true,
        };

        if (isPlatformBrowser(this.platformId)) {
            this.router.events
                .pipe(
                    untilDestroyed(this),
                    filter(event => event instanceof ActivationEnd),
                )
                .subscribe((event: ActivationEnd) => {
                    this.paramPlatform = event.snapshot.params.platform;

                    if (this.paramPlatform && this.sortedPlatforms?.length) {
                        this.activePlatform = this.sortedPlatforms.find(
                            platform => platform.name === this.paramPlatform,
                        );
                    }
                    // }
                });
        }

        effect(() => {
            this.content.selectedSection = this.menuService.selectedSection();
            this.content = { ...this.content };
        });
    }

    ngOnInit(): void {
        this.initMenu();

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
                }
            });
        } else {
            this.canViewDownloads = true;
        }
    }

    initMenu(): void {
        this.content = {
            base: menus.download.baseUrl,
            selectedSection: menus.download.releases.id,
            level1: [],
        };

        this.data.releases &&
            this.content.level1.push({
                id: menus.download.releases.id,
                label: this.LANG.menu.titles.releases,
                path: menus.download.releases.path,
            });
        this.data.betas &&
            this.content.level1.push({
                id: menus.download.betas.id,
                label: this.LANG.menu.titles.betas,
                path: menus.download.betas.path,
            });
        this.data.patches &&
            this.content.level1.push({
                id: menus.download.patches.id,
                label: this.LANG.menu.titles.patches,
                path: menus.download.patches.path,
            });
        this.data.other &&
            this.content.level1.push({
                id: menus.download.other.id,
                label: this.LANG.menu.titles.other,
                path: menus.download.other.path,
            });
    }
}
