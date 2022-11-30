import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { LocalStorageService } from 'ngx-webstorage';
import { first } from 'rxjs/operators';

import * as staticLang from '@common/language/language_i18n_static.json';
import { accountSelectors } from '@common/store/account';
import { icons } from '@lib/variables/static-variables';

@UntilDestroy()
@Component({
    selector: 'nx-cookie-banner',
    templateUrl: './cookie-banner.component.html',
    styleUrls: ['./cookie-banner.component.scss']
})
export class NxCookieBannerComponent implements OnInit {
    LANG = staticLang;
    cookieBannerReviewed: boolean;
    icons = icons;

    constructor(
        private localStorage: LocalStorageService,
        private store: Store,
    ) {}

    ngOnInit(): void {
        this.cookieBannerReviewed =
            this.localStorage.retrieve('cookiereviewed') === true;

        this.store.select(accountSelectors.selectCurrentUser)
            .pipe(first(value => value !== undefined), untilDestroyed(this))
            .subscribe(account => {
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

    onCookieBannerClose(): void {
        // will set cookie_reviewed in backend later
        this.localStorage.store('cookiereviewed', true);
        this.cookieBannerReviewed = true;
    }
}
