import { Component, OnInit } from '@angular/core';
import { IConfig, NxConfigService } from '@services/nx-config';
import { LocalStorageService }       from 'ngx-webstorage';
@Component({
    selector    : 'nx-cookie-banner',
    templateUrl : './cookie-banner.component.html',
    styleUrls   : ['./cookie-banner.component.scss']
})
export class NxCookieBannerComponent implements OnInit {
    CONFIG: IConfig
    cookieBannerReviewed: boolean

    constructor(private config: NxConfigService, private localStorage: LocalStorageService) {
        this.CONFIG = config.getConfig();
    }

    ngOnInit() {
        this.cookieBannerReviewed = this.localStorage.retrieve('cookiereviewed') === true;
    }

    onCookieBannerClose() {
        // will set cookie_reviewed in backend later
        this.localStorage.store('cookiereviewed', true);
        this.cookieBannerReviewed = true;
    }
}
