import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, filter, take } from 'rxjs';

import { environment } from '@environments/environment';
import { icons } from '@lib/variables/static-variables';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';

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
    icons = icons;
    inAuthorization = false;

    constructor(
        config: NxConfigService,
        private menusService: NxMenusService,
        private router: Router,
        public scrollMechanicsService: NxScrollMechanicsService,
        translateService: TranslateService,
    ) {
        translateService.onTranslationChange.pipe(untilDestroyed(this)).subscribe(() => {
            setTimeout(() => {
                this.getFooterMenu();
            });
        });

        this.inAuthorization = this.router.url.includes('/authorize');
        this.CONFIG = config.getConfig();

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
        this.getFooterMenu();
        this.checkVisible(this.router.url);
    }

    getFooterMenu(): void {
        this.menusService
            .getMenu('new footer')
            .pipe(take(1))
            .subscribe(footer => {
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

    checkVisible(url: string): void {
        this.visible$.next(!(url.includes('/systems') || url.includes('/health-report')));
    }
}
