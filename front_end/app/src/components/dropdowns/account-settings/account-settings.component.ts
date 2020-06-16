import {
    Component, Input, OnDestroy
}                                    from '@angular/core';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import {
    BehaviorSubject, combineLatest, Subject
}                                    from 'rxjs';
import { BaseDropdown }              from '../injDropdown';
import { NxConfigService }           from '../../../services/nx-config';
import { Account, NxAccountService } from '../../../services/account.service';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { takeUntil }                 from 'rxjs/operators';

@AutoUnsubscribe()
@Component({
    selector    : 'nx-account-settings-select',
    templateUrl : 'account-settings.component.html',
    styleUrls   : ['account-settings.component.scss']
})

export class NxAccountSettingsDropdown extends BaseDropdown implements OnDestroy {
    @Input() small = false;

    dropdownWidth$ = new BehaviorSubject(0);
    buttonWidth = new BehaviorSubject(0);
    rightOffset$ = new BehaviorSubject(0)
    unsub$ = new Subject();

    settings: Pick<Account, 'email' | 'is_staff' | 'is_superuser'> = {
        email        : '',
        is_staff     : false,
        is_superuser : false
    };

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private accountService: NxAccountService
    ) {
        super(languageService, configService);
    }

    ngOnInit() {
        this.accountService.accountSubject
            .pipe(takeUntil(this.unsub$))
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
        combineLatest(this.dropdownWidth$, this.buttonWidth)
            .pipe(takeUntil(this.unsub$))
            .subscribe(([dropdown, button]) => {
                if (dropdown && button) {
                    this.rightOffset$.next(Math.max(button - dropdown + 16, 0) | 0);
                }
            });
    }

    ngOnDestroy() {
        this.unsub$.next('done');
    }

    logout(): void {
        this.accountService.logout(false);
    }

    hide() {
        this.show = false;
        return false;
    }
}
