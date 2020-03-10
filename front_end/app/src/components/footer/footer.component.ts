import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer }      from '@angular/platform-browser';
import { NxConfigService, IConfig }   from '../../services/nx-config';
import { NxAppStateService } from '../../services/nx-app-state.service';
import { Subscription } from 'rxjs';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';

@AutoUnsubscribe()
@Component({
    selector: 'nx-footer',
    templateUrl: 'footer.component.html',
    styleUrls: [ 'footer.component.scss' ]
})
 export class NxFooterComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    companyLink: string;
    companyName: string;
    copyrightYear: string;
    footerItems: any;
    viewFooter: boolean;

    // options
    @Input() center: boolean;
    classes: string[] = [];
    private footerSubscription: Subscription;

    constructor(configService: NxConfigService,
                private sanitizer: DomSanitizer,
                private appState: NxAppStateService,) {
        this.CONFIG = configService.getConfig();
    }

    ngOnDestroy() {}

    ngOnInit() {
        this.companyLink = this.CONFIG.company.link;
        this.companyName = this.CONFIG.company.name;
        this.copyrightYear = this.CONFIG.company.copyrightYear;
        this.footerItems = this.CONFIG.footerItems;

        this.footerSubscription = this.appState.footerVisibleSubject.subscribe((visible) => {
            this.viewFooter = visible;
        });
    }

    trackItem(index, item) {
        if (!item) {
            return undefined;
        }
        return item.url;
    }
}
