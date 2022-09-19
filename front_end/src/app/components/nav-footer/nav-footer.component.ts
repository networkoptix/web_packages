import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

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

    constructor(private menusService: NxMenusService, config: NxConfigService, public scrollMechanicsService: NxScrollMechanicsService, languageService: NxLanguageProviderService) {
        this.CONFIG = config.getConfig();
        this.copyright = languageService.translations.appFooter.copyright({ currentYear: new Date().getFullYear().toString() });

        this.scrollMechanicsService.windowSizeSubject.pipe(untilDestroyed(this)).subscribe(({ width }) => {
            this.visible$.next(width > 576);
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
}
