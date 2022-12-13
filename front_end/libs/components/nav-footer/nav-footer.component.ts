import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, filter } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import { icons } from '@lib/variables/static-variables';
import { Translatable } from '@pipes/any-translate.types';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { GridBreakpoints } from '@styles/theme-variables-common';

@UntilDestroy()
@Component({
    selector: 'nx-nav-footer',
    templateUrl: './nav-footer.component.html',
    styleUrls: ['./nav-footer.component.scss'],
})
export class NxNavFooterComponent implements OnInit {
    footerItems: MenuNode[];
    CONFIG: IConfig;
    visible$ = new BehaviorSubject(true);
    returnToTopVisible$ = new BehaviorSubject(true);
    copyright: Translatable;
    icons = icons;
    inAuthorization = false;

    constructor(
        config: NxConfigService,
        translateService: TranslateService,
        private menusService: NxMenusService,
        private router: Router,
        public scrollMechanicsService: NxScrollMechanicsService,
    ) {
        this.inAuthorization = this.router.url.includes('/authorize');
        this.CONFIG = config.getConfig();
        this.copyright = {
            values: staticLang.appFooter.copyright,
            params: {
                currentYear: new Date().getFullYear().toString(),
            },
        };

        this.scrollMechanicsService.windowSizeSubject
            .pipe(untilDestroyed(this))
            .subscribe(({ width }) => {
                this.checkVisible(this.router.url, width);
            });

        this.router.events
            .pipe(
                filter(event => event instanceof NavigationEnd),
                untilDestroyed(this),
            )
            .subscribe((event: NavigationEnd) => {
                this.checkVisible(event.url);
            });
    }

    ngOnInit(): void {
        this.menusService.getMenu('footer').subscribe(footer => {
            this.footerItems = this.menusService.cleanEmptyNodes(footer.nodes);
            if (environment.isLocal) {
                this.footerItems.forEach(footerItem => {
                    footerItem.new_window = true;
                    footerItem.url = footerItem.url.replace(
                        '{{CLOUD_HOST}}',
                        this.CONFIG.cloudHost,
                    );
                });
            }
        });
    }

    scrollToTop(): void {
        this.scrollMechanicsService.windowScrollSubject.next(0);
    }

    checkVisible(
        url: string,
        width = this.scrollMechanicsService.windowSizeSubject.value.width,
    ): void {
        this.visible$.next(
            width > GridBreakpoints.SM && !url.includes('/systems'),
        );
    }
}
