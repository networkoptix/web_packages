import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer }      from '@angular/platform-browser';
import { NxConfigService }   from '../../services/nx-config';
import { NxAppStateService } from '../../services/nx-app-state.service';
import { ActivatedRoute }            from '@angular/router';
import { NxSettingsService } from '../../pages/systems/settings/settings.service';
import { Subscription } from 'rxjs';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';

@AutoUnsubscribe()
@Component({
    selector: 'nx-footer',
    templateUrl: 'footer.component.html',
    styleUrls: [ 'footer.component.scss' ]
})
 export class NxFooterComponent implements OnInit, OnDestroy {
    companyLink: string;
    companyName: string;
    copyrightYear: string;
    config: any;
    footerItems: any;
    viewFooter: boolean;

    // options
    @Input() center: boolean;
    classes: string[] = [];
    private footerSubscription: Subscription;

    constructor(private sanitizer: DomSanitizer,
                private appState: NxAppStateService,
                config: NxConfigService) {
        this.config = config.getConfig();
    }

    ngOnDestroy() {}

    ngOnInit() {
        this.companyLink = this.config.company.link;
        this.companyName = this.config.company.name;
        this.copyrightYear = this.config.company.copyrightYear;
        this.footerItems = this.config.footerItems;

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
