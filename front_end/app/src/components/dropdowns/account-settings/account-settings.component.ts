import { Component }                 from '@angular/core';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { Subscription }              from 'rxjs';
import { BaseDropdown }              from '../injDropdown';
import { NxConfigService }           from '../../../services/nx-config';
import { Account, NxAccountService } from '../../../services/account.service';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';

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

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private accountService: NxAccountService
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

    hide() {
        this.show = false;
        return false;
    }
}
