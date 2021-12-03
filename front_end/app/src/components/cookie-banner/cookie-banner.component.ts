import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { LocalStorageService } from 'ngx-webstorage';
import { first } from 'rxjs/operators';

import { NxAccountService } from '@services/account.service';
import { IConfig, NxConfigService } from '@services/nx-config';

@UntilDestroy()
@Component({
    selector: 'nx-cookie-banner',
    templateUrl: './cookie-banner.component.html',
    styleUrls: ['./cookie-banner.component.scss']
})
export class NxCookieBannerComponent implements OnInit {
    CONFIG: IConfig
    cookieBannerReviewed: boolean

    constructor(
        private config: NxConfigService,
        private localStorage: LocalStorageService,
        private accountService: NxAccountService
    ) {
        this.CONFIG = config.getConfig();
    }

    ngOnInit() {
        this.cookieBannerReviewed =
            this.localStorage.retrieve('cookiereviewed') === true;

        this.accountService.accountSubject
            .pipe(first(value => value !== undefined), untilDestroyed(this))
            .subscribe((account) => {
                if (account) {
                    if (account.cookie_reviewed) {
                        this.localStorage.store('cookiereviewed', true);
                        this.cookieBannerReviewed = true;
                    }
                    // Doesn't work properly yet, also might not be desirable, so commented out for now
                    // Also, shouldn't show for environment.isLocal === true && appStateService.authorizing === true
                    // } else {
                    //     // If a new account logs in and their cookie_reviewed is false, show banner
                    //     this.localStorage.store('cookiereviewed', false);
                    //     this.cookieBannerReviewed = false;
                    // }
                }
            });
    }

    onCookieBannerClose() {
        // will set cookie_reviewed in backend later
        this.localStorage.store('cookiereviewed', true);
        this.cookieBannerReviewed = true;
    }
}
