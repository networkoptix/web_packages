import { Component, OnInit } from '@angular/core';
import { DomSanitizer }      from '@angular/platform-browser';
import { NxConfigService }   from '../../services/nx-config';
import { NxAppStateService } from '../../services/nx-app-state.service';

@Component({
    selector: 'nx-footer',
    templateUrl: 'footer.component.html',
    styleUrls: [ 'footer.component.scss' ]
})
 export class NxFooterComponent implements OnInit {
    companyLink: string;
    companyName: string;
    copyrightYear: string;
    config: any;
    footerItems: any;
    viewFooter: boolean;

    constructor(private sanitizer: DomSanitizer,
                private _config: NxConfigService,
                private appState: NxAppStateService) {
        this.config = this._config.getConfig();
    }

    ngOnInit() {
        this.companyLink = this.config.companyLink;
        this.companyName = this.config.companyName;
        this.copyrightYear = this.config.copyrightYear;
        this.footerItems = this.config.footerItems;

        this.footerItems.forEach((item) => {
            switch (item.url) {
                case '%SUPPORT_LINK%':
                    item.url = this.config.supportLink;
                    break;
                case '%PRIVACY_LINK%':
                    item.url = this.config.privacyLink;
                    break;
                default:
            }
        });

        this.appState.footerVisibleObservable.subscribe((visible) => {
            this.viewFooter = visible;
        });
    }
}
