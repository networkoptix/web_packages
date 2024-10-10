import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { environment } from '@environments/environment';
import { PipesModule } from '@pipes/pipes.module';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { NxAppStateService } from '@services/nx-app-state.service';
import { nxConfig } from '@services/nx-config/config';

@UntilDestroy()
@Component({
    selector: 'nx-footer',
    templateUrl: 'footer.component.html',
    styleUrls: ['footer.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, TranslateModule, PipesModule],
})
export class NxFooterComponent implements OnInit {
    CONFIG = nxConfig;
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
        private appState: NxAppStateService,
        public menusService: NxMenusService,
        translateService: TranslateService,
    ) {
        translateService.onTranslationChange.pipe(untilDestroyed(this)).subscribe(() => {
            setTimeout(() => {
                this.getMenu();
            });
        });
    }

    ngOnInit(): void {
        this.visible = this.oauth || !nxConfig.featureFlags.newHeader;
        this.companyLink = this.CONFIG.company.links.website;
        this.companyName = this.CONFIG.company.name;
        this.copyrightYear = this.CONFIG.company.copyrightYear;

        this.getMenu();
        this.appState.footerVisibleSubject.pipe(untilDestroyed(this)).subscribe(visible => {
            this.viewFooter = visible;
        });
    }

    trackItem(index, item) {
        return item ? item.url : undefined;
    }

    private getMenu(): void {
        this.menusService.getMenu('footer').subscribe(footer => {
            this.footerItems = this.menusService.cleanEmptyNodes(footer.nodes);
            if (environment.isWebadmin) {
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
}
