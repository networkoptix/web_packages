import {
    Component,
    ElementRef,
    Input,
    OnDestroy,
    ViewChild
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import {
    BehaviorSubject,
    combineLatest,
    SubscriptionLike
} from 'rxjs';

import { CoercedBoolInput, IBool } from '@decorators/ibool';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
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
    @IBool() @Input() small: CoercedBoolInput;
    @ViewChild('dropdown') dropdown: ElementRef<HTMLDivElement>;
    dropdownWidth$ = new BehaviorSubject(0);
    buttonWidth = new BehaviorSubject(0);
    rightOffset$ = new BehaviorSubject(0);
    newHeader = false;
    isAccountRoute = false;
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
        headerService: NxHeaderService,
        private accountService: NxAccountService
    ) {
        super(languageService, configService);
        this.newHeader = this.CONFIG.featureFlags.newHeader;
        headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(location => {
            this.isAccountRoute = location?.path?.includes('/account');
        });
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
                    this.displayedFullName = this.makeFullName(account);
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
                    const self = this?.dropdown.nativeElement;
                    let widthFromRightEdge = 0;
                    if (this.environment.isLocal && self?.parentNode.nextSibling) {
                        widthFromRightEdge = -1 * (self.parentNode.nextSibling as HTMLElement).offsetWidth;
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

    hide(): false {
        this.show = false;
        return false;
    }

    makeFullName(account: Account): string {
        if (account.first_name && account.last_name) {
            return (account.first_name + ' ' + account.last_name.charAt(0) + '.').toUpperCase();
        } else if (account.name) {
            return account.name.toUpperCase();
        } else {
            return '';
        }
    }
}
