import {
    Component,
    ElementRef,
    Input,
    OnDestroy,
    ViewChild
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import {
    BehaviorSubject,
    combineLatest,
    SubscriptionLike
} from 'rxjs';

import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { BaseDropdown } from '../injDropdown';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-account-settings-select',
    templateUrl: 'account-settings.component.html',
    styleUrls: [
        environment.isLocal
            ? 'account-settings-webadmin.component.scss'
            : 'account-settings.component.scss'
    ]
})

export class NxAccountSettingsDropdown extends BaseDropdown implements OnDestroy {
    @Input() small = false;
    @ViewChild('dropdown') dropdown: ElementRef<HTMLDivElement>;
    dropdownWidth$ = new BehaviorSubject(0);
    buttonWidth = new BehaviorSubject(0);
    rightOffset$ = new BehaviorSubject(0);
    newHeader = false;
    displayedFullName = '';

    accountSubscription: SubscriptionLike;
    widthSubscription: SubscriptionLike;

    readonly environment = environment;

    settings: Pick<Account, 'name' | 'email' | 'is_staff' | 'is_superuser' | 'first_name' | 'last_name'> = {
        name: '',
        email: '',
        first_name: '',
        last_name: '',
        is_staff: false,
        is_superuser: false
    };

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService,
        private accountService: NxAccountService
    ) {
        super(languageService, configService);
        this.newHeader = this.CONFIG.featureFlags.newHeader;
    }

    ngOnInit(): void {
        this.accountSubscription = this.accountService.accountSubject
            .subscribe(account => {
                if (account) {
                    this.settings = {
                        name: account.name,
                        first_name: account.first_name,
                        last_name: account.last_name,
                        email: account.email,
                        is_staff: account.is_staff,
                        is_superuser: account.is_superuser
                    };
                    this.displayedFullName = (account.first_name + ' ' + account.last_name[0] + '.').toUpperCase();
                } else {
                    this.settings = {
                        name: '',
                        email: '',
                        first_name: '',
                        last_name: '',
                        is_staff: false,
                        is_superuser: false
                    };
                    this.displayedFullName = '';
                }
            });
        this.widthSubscription = combineLatest(this.dropdownWidth$, this.buttonWidth)
            .subscribe(([dropdown, button]) => {
                if (dropdown && button) {
                    const self: any = this?.dropdown.nativeElement;
                    let widthFromRightEdge = 0;
                    if (this.environment.isLocal && self?.parentNode.nextSibling) {
                        widthFromRightEdge = -1 * self.parentNode.nextSibling.offsetWidth;
                    }

                    this.rightOffset$.next(
                        Math.max(button - dropdown + 18, widthFromRightEdge) | 0
                    );
                }
            });
    }

    ngOnDestroy(): void {}

    logout(): void {
        this.accountService.logout(false);
    }

    hide() {
        this.show = false;
        return false;
    }
}
