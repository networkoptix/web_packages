import {
    AfterViewInit,
    Component,
    ElementRef,
    HostListener,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
    ViewContainerRef
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import { NxPopoverService } from '@components/popover/popover.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import {
    addPseudoAnchor,
    clearPseudoAnchors,
    PseudoAnchorTarget,
    sleep
} from '@utils/general';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-account-security-component',
    templateUrl: 'security.component.html',
    styleUrls: ['security.component.scss']
})
export class NxAccountSecurityComponent implements OnInit, AfterViewInit, OnDestroy {
    LANG = staticLang;

    account: Account;
    account2faEnabled: boolean;
    account2faEnabledCheck: boolean;
    totpExistsForAccount: boolean;

    twoFaSystems: NxSystemInfo[] = [];
    subV5Systems: NxSystemInfo[] = [];
    icons = icons;
    private targets: PseudoAnchorTarget[] = [];

    @ViewChild('twoFaSystemsSpan') private twoFaSystemsSpan: ElementRef<HTMLSpanElement>;
    @ViewChild('v5WarningSpan') private v5WarningSpan: ElementRef<HTMLSpanElement>;
    @ViewChild('popLegend2faTemplate') private popLegend2faTemplate: TemplateRef<unknown>;
    @ViewChild('popLegendSubV5Template') private popLegendSubV5Template: TemplateRef<unknown>;

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
        this.account = this.accountService.account;

        this.account2faEnabled = this.account.account2faEnabled;
        this.account2faEnabledCheck = this.account.account2faEnabled;
        this.totpExistsForAccount = this.account.totpExistsForAccount;

        this.systemsService.systemsSubject
            .pipe(untilDestroyed(this))
            .subscribe(systems => {
                this.twoFaSystems = systems.filter(sys => sys.system2faEnabled);
                this.subV5Systems = systems.filter(sys => !sys.useRest);

                setTimeout(() => {
                    this.clearPopoverTargets();
                    this.setPopoverTargets();
                });
            });
    }

    toggleVerification(value: boolean): void {
        if (value === undefined || value === this.account2faEnabled) {
            // checkbox not initialized
            // or click happened during initialization
            return;
        }
        this.dialogs
            .account2faCodeToggle(value)
            .then(action => {
                if (action !== 'canceled') {
                    this.account2faEnabled = (action === 'enabled');
                    this.accountService.get(true).catch(e => { });
                }
                this.account2faEnabledCheck = this.account2faEnabled;
            });
    }

    private clearPopoverTargets(): void {
        this.targets = clearPseudoAnchors(this.targets);
        this.popoverService.close();
    }

    private async setPopoverTargets(): Promise<void> {
        if (this.subV5Systems.length && this.v5WarningSpan) {
            await sleep();
            const targetV5 = this.v5WarningSpan.nativeElement
                .querySelector<HTMLSpanElement>('span#targetV5');
            addPseudoAnchor(
                this.targets,
                targetV5,
                this.popLegendSubV5Template,
                'click',
                this.showPopoverWithTemplate.bind(this)
            );
        }

        if (this.twoFaSystems.length && this.twoFaSystemsSpan) {
            await sleep();
            const target2FaSystems = this.twoFaSystemsSpan.nativeElement
                .querySelector<HTMLSpanElement>('span#target2FaSystems');
            addPseudoAnchor(
                this.targets,
                target2FaSystems,
                this.popLegend2faTemplate,
                'click',
                this.showPopoverWithTemplate.bind(this)
            );
        }
    }

    ngAfterViewInit(): void {
        // popover targets are in ngIf blocks and need to be "translated" first
        // ... we need to wait before set them
        setTimeout(() => { this.setPopoverTargets(); });
    }

    private showPopoverWithTemplate(template: TemplateRef<unknown>, target: HTMLElement): void {
        if (this.popoverService.close() === target.id) {
            return;
        }
        this.popoverService.open(
            template,
            target,
            {
                panelClass: 'system-popover',
            },
            this._viewContainerRef);
    }

    @HostListener('document:click', ['$event.target'])
    onMouseClick(targetElement: HTMLElement): void {
        if (targetElement.className !== 'pseudo-anchor') {
            this.popoverService.close();
        }
    }

    ngOnDestroy(): void {
        this.clearPopoverTargets();
    }

    switch2FA(targetState: boolean): void {
        this.totpExistsForAccount = targetState;
        // Combine success handler; Do in releases_21.1_hotfix after 21.1 release
        if (targetState) {
            this.dialogs
                .account2faEnable()
                .then(action => {
                    const newState = (action === 'enabled');
                    this.account2faEnabled = newState;
                    this.totpExistsForAccount = newState;
                    this.account2faEnabledCheck = this.account2faEnabled;
                    this.accountService.get(true).catch(_ => { });
                    setTimeout(() => {
                        this.setPopoverTargets();
                    });
                });
        } else {
            this.dialogs
                .account2faDisable(this.twoFaSystems.length)
                .then(action => {
                    if (action !== 'canceled') {
                        const newState = !(action === 'disabled');
                        this.account2faEnabled = newState;
                        this.totpExistsForAccount = newState;
                        this.account2faEnabledCheck = this.account2faEnabled;
                        this.accountService.get(true).catch(_ => { });
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
