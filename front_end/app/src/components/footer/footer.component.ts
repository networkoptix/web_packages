import { Component, OnInit } from '@angular/core';
import { DomSanitizer }      from '@angular/platform-browser';
import { NxConfigService }   from '../../services/nx-config';
import { NxAppStateService } from '../../services/nx-app-state.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';

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
    lang: any;
    viewFooter: boolean;

    constructor(private sanitizer: DomSanitizer,
                private _config: NxConfigService,
                private appState: NxAppStateService,
                private language: NxLanguageProviderService) {
        this.config = this._config.getConfig();
    }

    ngOnInit() {
        this.companyLink = this.config.companyLink;
        this.companyName = this.config.companyName;
        this.copyrightYear = this.config.copyrightYear;
        this.language
            .translationsSubject
            .subscribe((lang) => {
                this.lang = lang;
                this.footerItems = this.config.footerItems.map((item) => {
                    item.name = this.lang.defaultFooter[item.name] || item.name;
                    return item;
                });
                this.appState.footerVisibleObservable.subscribe((visible) => {
                    this.viewFooter = visible;
                });
            });
    }
}
