import { Component }                 from '@angular/core';
import { Router }                    from '@angular/router';
import { Subscription }              from 'rxjs';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { NxConfigService }           from '../../../services/nx-config';
import { NxAccountService }          from '../../../services/account.service';
import { NxSessionService }          from '../../../services/session.service';
import { BaseDropdown }              from '../injDropdown';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';

@AutoUnsubscribe()
@Component({
    selector: 'nx-account-settings-select',
    templateUrl: 'account-settings.component.html',
    styleUrls: ['account-settings.component.scss']
})

export class NxAccountSettingsDropdown extends BaseDropdown {
    settings = {
        email: '',
        is_staff: false,
        is_superuser: false
    };

    private loginSubscription: Subscription;

    constructor(private accountService: NxAccountService,
                private languageService: NxLanguageProviderService,
                private configService: NxConfigService,
                private sessionService: NxSessionService,
                private router: Router,

    ) {
        super(languageService, configService);
    }

    ngOnInit()  {
        this.getAccount();
        this.loginSubscription = this.accountService.loginStateSubject
            .subscribe(() => {
                this.getAccount();
            });
    }

    getAccount() {
        this.accountService
            .get()
            .then(account => {
                if (account) {
                    this.settings.email = account.email;
                    this.settings.is_staff = account.is_staff;
                    this.settings.is_superuser = account.is_superuser;
                }
            });
    }

    logout(): void {
        const url = this.router.url;
        const stay = url.startsWith('/systems') ||
                     url.startsWith('/account') ||
                     url.startsWith('/push-notifications') ||
                     url.startsWith('/download') && !this.CONFIG.cloudCapabilities.publicDownloads  ||
                     url.startsWith('/downloads') && !this.CONFIG.cloudCapabilities.publicReleases;
        this.accountService.logout(!stay);
    }
}
