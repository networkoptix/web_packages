import {
    Component,
    Input,
    OnDestroy,
    OnInit
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';

import { environment } from '@environments/environment';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@UntilDestroy()
@Component({
    selector: 'nx-footer',
    templateUrl: 'footer.component.html',
    styleUrls: ['footer.component.scss']
})
export class NxFooterComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    companyLink: string;
    companyName: string;
    copyrightYear: string;
    footerItems: MenuNode[];
    viewFooter: boolean;
    visible = true;

    // options
    @Input() center: boolean;
    @Input() oauth = false;
    classes: string[] = [];

    constructor(
        configService: NxConfigService,
        private appState: NxAppStateService,
        private menusService: NxMenusService,
        translateService: TranslateService
    ) {
        this.CONFIG = configService.getConfig();

        translateService.onTranslationChange
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                setTimeout(() => {
                    this.getMenu();
                });
            });
    }

    ngOnDestroy(): void {}

    ngOnInit(): void {
        this.visible = this.oauth || this.CONFIG.featureFlags.newHeader;
        this.companyLink = this.CONFIG.company.links.website;
        this.companyName = this.CONFIG.company.name;
        this.copyrightYear = this.CONFIG.company.copyrightYear;

        this.getMenu();
        this.appState.footerVisibleSubject
            .pipe(untilDestroyed(this))
            .subscribe(visible => {
                this.viewFooter = visible;
            });
    }

    trackItem(index, item) {
        return item ? item.url : undefined;
    }

    private getMenu(): void {
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
}
