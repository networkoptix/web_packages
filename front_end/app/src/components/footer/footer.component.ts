import {
    Component,
    Input,
    OnDestroy,
    OnInit
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';

import { environment } from '@environments/environment';
import { NxMenusService } from '@services/menus.service';
import { MenuNode } from '@services/menus.service.types';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@UntilDestroy({ checkProperties: true })
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

    // options
    @Input() center: boolean;
    @Input() oauth = false;
    classes: string[] = [];
    private footerSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        private appState: NxAppStateService,
        private menusService: NxMenusService
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngOnDestroy(): void {}

    ngOnInit(): void {
        this.companyLink = this.CONFIG.company.links.website;
        this.companyName = this.CONFIG.company.name;
        this.copyrightYear = this.CONFIG.company.copyrightYear;
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

        this.footerSubscription =
            this.appState.footerVisibleSubject
                .subscribe(visible => {
                    this.viewFooter = visible;
                });
    }

    trackItem(index, item) {
        return item ? item.url : undefined;
    }
}
