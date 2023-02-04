import { Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { BehaviorSubject, combineLatest } from 'rxjs';

import { accountSelectors } from '@common/store/account';
import { CoercedBoolInput, IBool } from '@decorators/ibool';
import { environment } from '@environments/environment';
import { icons, accountDropdown, accountDropdownStaff } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { AccountDropdown } from '@services/nx-config/base-config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';

import { BaseDropdown } from '../injDropdown';

@UntilDestroy()
@Component({
    selector: 'nx-account-settings-select',
    templateUrl: 'account-settings.component.html',
    styleUrls: [
        environment.isLocal
            ? 'account-settings-webadmin.component.scss'
            : 'account-settings.component.scss',
    ],
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

    icons = icons;

    readonly environment = environment;

    settings: Pick<
        Account,
        'name' | 'email' | 'is_staff' | 'is_superuser' | 'first_name' | 'last_name'
    > = {
        name: '',
        email: '',
        first_name: '',
        last_name: '',
        is_staff: false,
        is_superuser: false,
    };
    accountDropdownStaff: AccountDropdown[];
    accountDropdown: AccountDropdown[];

    constructor(
        configService: NxConfigService,
        headerService: NxHeaderService,
        private accountService: NxAccountService,
        private store: Store,
    ) {
        super(configService);
        this.accountDropdown = accountDropdown;
        this.accountDropdownStaff = accountDropdownStaff;
        this.newHeader = this.CONFIG.featureFlags.newHeader;
        headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(location => {
            this.isAccountRoute = location?.path?.includes('/account');
        });
    }

    ngOnInit(): void {
        this.store
            .select(accountSelectors.selectCurrentUser)
            .pipe(untilDestroyed(this))
            .subscribe(account => {
                if (account) {
                    this.settings = {
                        name: account.name,
                        first_name: account.first_name,
                        last_name: account.last_name,
                        email: account.email,
                        is_staff: account.is_staff,
                        is_superuser: account.is_superuser,
                    };
                    this.displayedFullName = this.makeFullName(account);
                } else {
                    this.settings = {
                        name: '',
                        email: '',
                        first_name: '',
                        last_name: '',
                        is_staff: false,
                        is_superuser: false,
                    };
                    this.displayedFullName = '';
                }
            });
        combineLatest(this.dropdownWidth$, this.buttonWidth)
            .pipe(untilDestroyed(this))
            .subscribe(([dropdown, button]) => {
                if (dropdown && button) {
                    const self = this?.dropdown.nativeElement;
                    let widthFromRightEdge = 0;
                    if (this.environment.isLocal && self?.parentNode.nextSibling) {
                        widthFromRightEdge =
                            -1 * (self.parentNode.nextSibling as HTMLElement).offsetWidth;
                    }

                    this.rightOffset$.next(
                        Math.max(button - dropdown + 18, widthFromRightEdge) | 0,
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
