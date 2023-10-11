import { CommonModule } from '@angular/common';
import {
    Component,
    ElementRef,
    Input,
    ViewChild,
    booleanAttribute,
    computed,
    signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { BehaviorSubject } from 'rxjs';

import { accountSelectors } from '@common/store/account';
import { accountDropdown } from '@components/static-variables-components';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxArrowNavDirective } from '@directives/nx-arrow-nav';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { AccountDropdown } from '@services/nx-config/base-config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { UserType } from '@services/system-user.types';
import { icons } from '@static-variables';

import { BaseDropdown } from '../injDropdown';

type SettingsType = Pick<
    Account,
    'name' | 'email' | 'is_staff' | 'is_superuser' | 'first_name' | 'last_name' | 'type'
>;

@UntilDestroy()
@Component({
    selector: 'nx-account-settings-select',
    templateUrl: 'account-settings.component.html',
    styleUrls: [
        environment.isLocal
            ? 'account-settings-webadmin.component.scss'
            : 'account-settings.component.scss',
    ],
    imports: [
        CommonModule,
        RouterModule,
        TranslateModule,
        AngularSvgIconModule,
        NxResizeObserver,
        NxAddSvgSrcDirective,
        NxArrowNavDirective,
        NxClickElsewhereDirective,
        NxTooltipDirective,
    ],
    standalone: true,
})
export class NxAccountSettingsDropdown extends BaseDropdown {
    @Input({ transform: booleanAttribute }) small: boolean;
    @ViewChild('dropdown') dropdown: ElementRef<HTMLDivElement>;
    dropdownWidth$ = new BehaviorSubject(0);
    buttonWidth = new BehaviorSubject(0);
    newHeader = false;
    isAccountRoute = false;
    displayedFullName = '';

    icons = icons;

    readonly environment = environment;

    settings$$ = signal<SettingsType>({
        name: '',
        email: '',
        first_name: '',
        last_name: '',
        is_staff: false,
        is_superuser: false,
        type: undefined,
    });

    readonly _accountDropdownStaff: AccountDropdown[] = [
        {
            name: 'Administration',
            route: '/admin/',
            newWindow: true,
        },
        {
            name: 'Channel partners',
            route: '/partners/',
            newWindow: false,
        },
    ];
    accountDropdown: AccountDropdown[];
    accountDropdownStaff: AccountDropdown[];

    constructor(
        configService: NxConfigService,
        headerService: NxHeaderService,
        private accountService: NxAccountService,
        private store: Store,
    ) {
        super(configService);
        this.accountDropdown = accountDropdown;
        const channelPartners = this.CONFIG.featureFlags.channelPartners;
        this.accountDropdownStaff = this._accountDropdownStaff.filter(
            ({ name }) => channelPartners || !name.includes('Channel partners'),
        );
        this.newHeader = this.CONFIG.featureFlags.newHeader;
        headerService.currentLocation$.pipe(untilDestroyed(this)).subscribe(location => {
            this.isAccountRoute = location?.path?.includes('/account');
        });
    }

    userSvg$$ = computed<string>(() => {
        const isTempUser = this.settings$$().type === UserType.temporaryLocal;
        const userSvg = isTempUser ? 'user_temp.svg' : 'user.svg';
        return icons.dir + userSvg;
    });

    ngOnInit(): void {
        this.store
            .select(accountSelectors.selectCurrentUser)
            .pipe(untilDestroyed(this))
            .subscribe(account => {
                if (account) {
                    this.settings$$.set({
                        name: account.name,
                        first_name: account.first_name,
                        last_name: account.last_name,
                        email: account.email,
                        is_staff: account.is_staff,
                        is_superuser: account.is_superuser,
                        type: account.type,
                    });
                    this.displayedFullName = this.makeFullName(account);
                } else {
                    this.settings$$.set({
                        name: '',
                        email: '',
                        first_name: '',
                        last_name: '',
                        is_staff: false,
                        is_superuser: false,
                        type: undefined,
                    });
                    this.displayedFullName = '';
                }
            });
    }

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
