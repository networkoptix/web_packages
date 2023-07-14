import {
    Component,
    HostListener,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewContainerRef,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import staticLang from '@common/language/language_i18n_static.json';
import { NxPopoverService } from '@components/popover/popover.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';
import { NxMenuService } from '@menu/menu.service';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';

@UntilDestroy()
@Component({
    selector: 'nx-account-security-component',
    templateUrl: 'security.component.html',
    styleUrls: ['security.component.scss'],
})
export class NxAccountSecurityComponent implements OnInit, OnDestroy {
    LANG = staticLang;

    account: Account;
    account2faEnabled: boolean;
    account2faEnabledCheck: boolean;
    totpExistsForAccount: boolean;

    twoFaSystems: NxSystemInfo[] = [];
    subV5Systems: NxSystemInfo[] = [];
    icons = icons;

    constructor(
        private accountService: NxAccountService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private systemsService: NxSystemsService,
        private popoverService: NxPopoverService,
        private _viewContainerRef: ViewContainerRef,
    ) {
        this.menuService.detail = 'security';
    }

    ngOnInit(): void {
        this.accountService.get().then(account => {
            this.account = account;
            this.account2faEnabled = account.account2faEnabled;
            this.account2faEnabledCheck = account.account2faEnabled;
            this.totpExistsForAccount = account.totpExistsForAccount;
        });

        this.systemsService.systemsSubject.pipe(untilDestroyed(this)).subscribe(systems => {
            this.twoFaSystems = systems.filter(sys => sys.system2faEnabled);
            /* If the system doesn't have a version useRest will be false.
            This should only happen on non-prod instances where mediator is out of date. */
            this.subV5Systems = systems.filter(sys => !sys.useRest);
        });
    }

    ngOnDestroy(): void {
        this.popoverService.close();
    }

    toggleVerification(value: boolean): void {
        if (value === undefined || value === this.account2faEnabled) {
            // checkbox not initialized
            // or click happened during initialization
            return;
        }
        this.dialogs.account2faCodeToggle(value).then(action => {
            if (action !== 'canceled') {
                this.account2faEnabled = action === 'enabled';
                this.accountService.get(true).catch(e => {});
            }
            this.account2faEnabledCheck = this.account2faEnabled;
        });
    }

    showPopoverWithTemplate(template: TemplateRef<unknown>, target: HTMLElement): void {
        if (this.popoverService.close() === target.id) {
            return;
        }
        this.popoverService.open(
            template,
            target,
            {
                panelClass: 'system-popover',
            },
            this._viewContainerRef,
        );
    }

    @HostListener('document:click', ['$event.target'])
    onMouseClick(targetElement: HTMLElement): void {
        if (targetElement.className !== 'pseudo-anchor') {
            this.popoverService.close();
        }
    }

    switch2FA(targetState: boolean): void {
        this.totpExistsForAccount = targetState;
        // Combine success handler; Do in releases_21.1_hotfix after 21.1 release
        if (targetState) {
            this.dialogs.account2faEnable().then(action => {
                const newState = action === 'enabled';
                this.account2faEnabled = newState;
                this.totpExistsForAccount = newState;
                this.account2faEnabledCheck = this.account2faEnabled;
                this.accountService.get(true).catch(_ => {});
            });
        } else {
            this.dialogs.account2faDisable(this.twoFaSystems.length).then(action => {
                if (action !== 'canceled') {
                    const newState = !(action === 'disabled');
                    this.account2faEnabled = newState;
                    this.totpExistsForAccount = newState;
                    this.account2faEnabledCheck = this.account2faEnabled;
                    this.accountService.get(true).catch(_ => {});
                } else {
                    this.totpExistsForAccount = true; // revert value on cancel
                }
            });
        }
    }

    genNewCode(): void {
        this.dialogs.account2faNewBackupCodes();
    }
}
