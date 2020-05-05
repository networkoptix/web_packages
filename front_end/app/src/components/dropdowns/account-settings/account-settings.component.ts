import { Component }                 from '@angular/core';
import { Router }                    from '@angular/router';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { Subscription }              from 'rxjs';
import { BaseDropdown }              from '../injDropdown';
import {
    NxConfigService, NxSessionService,
    NxAccountService, Account,
    NxLanguageProviderService
}                                    from '../../../services';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-account-settings-select',
    templateUrl : 'account-settings.component.html',
    styleUrls   : ['account-settings.component.scss']
})

export class NxAccountSettingsDropdown extends BaseDropdown {
    settings: Pick<Account, 'email' | 'is_staff' | 'is_superuser'> = {
        email        : '',
        is_staff     : false,
        is_superuser : false
    };

    private loginSubscription: Subscription;

    constructor(private accountService: NxAccountService,
                private languageService: NxLanguageProviderService,
                private configService: NxConfigService,
                private sessionService: NxSessionService,
                private router: Router
    ) {
        super(languageService, configService);
    }

    ngOnInit() {
        this.loginSubscription = this.accountService.accountSubject
            .subscribe((account) => {
                if (account) {
                    this.settings = {
                        email        : account.email,
                        is_staff     : account.is_staff,
                        is_superuser : account.is_superuser
                    };
                } else {
                    this.settings = {
                        email        : '',
                        is_staff     : false,
                        is_superuser : false
                    };
                }
            });
    }

    logout(): void {
        this.accountService.logout(false);
    }
}
