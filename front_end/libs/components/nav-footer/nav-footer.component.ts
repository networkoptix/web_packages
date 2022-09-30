import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, filter } from 'rxjs';

import { environment } from '@environments/environment';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';

@UntilDestroy()
@Component({
    selector: 'nx-nav-footer',
    templateUrl: './nav-footer.component.html',
    styleUrls: ['./nav-footer.component.scss']
})
export class NxNavFooterComponent implements OnInit {
    footerItems: MenuNode[];
    CONFIG: IConfig;
    visible$ = new BehaviorSubject(true);
    returnToTopVisible$ = new BehaviorSubject(true);
    copyright: string;

    constructor(
        config: NxConfigService,
        languageService: NxLanguageProviderService,
        private menusService: NxMenusService,
        private router: Router,
        public scrollMechanicsService: NxScrollMechanicsService
    ) {
        this.CONFIG = config.getConfig();
        this.copyright = languageService.translations.appFooter.copyright({ currentYear: new Date().getFullYear().toString() });

        this.scrollMechanicsService.windowSizeSubject.pipe(untilDestroyed(this)).subscribe(({ width }) => {
            this.checkVisible(this.router.url, width);
        });

        this.router.events.pipe(filter(event => event instanceof NavigationEnd), untilDestroyed(this)).subscribe((event: NavigationEnd) => {
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
                        this.CONFIG.cloudHost
                    );
                });
            }
        });
    }

    scrollToTop(): void {
        this.scrollMechanicsService.windowScrollSubject.next(0);
    }

    checkVisible(url: string, width = this.scrollMechanicsService.windowSizeSubject.value.width): void {
        const bootstrapXS = 576;
        this.visible$.next(width > bootstrapXS && !url.includes('/systems'));
    }
}
