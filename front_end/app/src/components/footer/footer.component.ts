import {
    Component, Input,
    OnDestroy, OnInit
}                                   from '@angular/core';
import { DomSanitizer }             from '@angular/platform-browser';
import { UntilDestroy }             from '@ngneat/until-destroy';
import { Subscription }             from 'rxjs';

import { MenuNode }                 from '../dropdowns/drop-menu/navigation-tile/navigation-tile.component';
import { NxConfigService, IConfig } from '../../services/nx-config';
import { NxAppStateService }        from '../../services/nx-app-state.service';
import { NxMenusService }           from '../../services/menus.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector   : 'nx-footer',
    templateUrl: 'footer.component.html',
    styleUrls  : ['footer.component.scss']
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
    classes: string[] = [];
    private footerSubscription: Subscription;

    constructor(configService: NxConfigService,
                private sanitizer: DomSanitizer,
                private appState: NxAppStateService,
                private menusService: NxMenusService) {
        this.CONFIG = configService.getConfig();
    }

    ngOnDestroy() {
    }

    ngOnInit() {
        this.companyLink = this.CONFIG.company.links.website;
        this.companyName = this.CONFIG.company.name;
        this.copyrightYear = this.CONFIG.company.copyrightYear;
        this.menusService.getMenu('Footer').subscribe(footer => {
            this.footerItems = footer;
        });

        this.footerSubscription = this.appState.footerVisibleSubject.subscribe((visible) => {
            this.viewFooter = visible;
        });
    }

    trackItem(index, item) {
        return item ? item.url : undefined;
    }
}
