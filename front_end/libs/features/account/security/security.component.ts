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
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxPopoverService } from '@components/popover/popover.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import {
    addPseudoAnchor,
    clearPseudoAnchors,
    PseudoAnchorTarget
} from '@utils/general';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-account-security-component',
    templateUrl: 'security.component.html',
    styleUrls: ['security.component.scss']
})
export class NxAccountSecurityComponent implements OnInit, AfterViewInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    account: Account;
    account2faEnabled: boolean;
    account2faEnabledCheck: boolean;
    totpExistsForAccount: boolean;

    twoFaSystems: NxSystemInfo[] = [];
    subV5Systems: NxSystemInfo[] = [];

    targets: PseudoAnchorTarget[] = [];

    @ViewChild('twoFaSystemsSpan') twoFaSystemsSpan: ElementRef;
    @ViewChild('v5WarningSpan') v5WarningSpan: ElementRef;
    @ViewChild('popLegend2faTemplate') popLegend2faTemplate: TemplateRef<any>;
    @ViewChild('popLegendSubV5Template') popLegendSubV5Template: TemplateRef<any>;
    @ViewChild('applyContainer', { read: ViewContainerRef, static: true }) applyContainer;

    private setupDefaults(): void {
        this.menuService.detail = 'security';
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private accountService: NxAccountService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private pageService: NxPageService,
        private systemsService: NxSystemsService,
        private popoverService: NxPopoverService,
        private _viewContainerRef: ViewContainerRef,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pageService.pageTitle = this.LANG.pageTitles.security;
        this.account = this.accountService.account;

        this.account2faEnabled = this.account.account2faEnabled;
        this.account2faEnabledCheck = this.account.account2faEnabled;
        this.totpExistsForAccount = this.account.totpExistsForAccount;

        this.systemsService.systemsSubject
            .pipe(untilDestroyed(this))
            .subscribe(systems => {
                this.twoFaSystems = systems.filter(sys => sys.system2faEnabled);
                this.subV5Systems = systems.filter(sys => !sys.useRest);

                this.clearPopoverTargets();
                this.setPopoverTargets();
            });
    }

    toggleVerification(value) {
        if (value === undefined || value === this.account2faEnabled) {
            // checkbox not initialized
            // or click happened during initialization
            return;
        }
        this.dialogs
            .toggleVerificationCode(value)
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

    private setPopoverTargets(): void {
        if (this.subV5Systems.length && this.v5WarningSpan) {
            const targetV5 = this.v5WarningSpan.nativeElement.querySelector('span#targetV5');
            addPseudoAnchor(
                this.targets,
                targetV5,
                this.popLegendSubV5Template,
                'click',
                this.showPopoverWithTemplate.bind(this));
        }

        if (this.twoFaSystems.length && this.twoFaSystemsSpan) {
            const target2FaSystems = this.twoFaSystemsSpan.nativeElement.querySelector('span#target2FaSystems');
            addPseudoAnchor(
                this.targets,
                target2FaSystems,
                this.popLegend2faTemplate,
                'click',
                this.showPopoverWithTemplate.bind(this));
        }
    }

    ngAfterViewInit(): void {
        // popover targets are in ngIf blocks and need to be "translated" first
        // ... we need to wait before set them
        setTimeout(() => { this.setPopoverTargets(); });
    }

    showPopoverWithTemplate(template: TemplateRef<any>, target: any): void {
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
    onMouseClick(targetElement): void {
        if (targetElement.className !== 'pseudo-anchor') {
            this.popoverService.close();
        }
    }

    ngOnDestroy(): void {
        this.clearPopoverTargets();
    }

    switchToggle(targetState: boolean): void {
        this.totpExistsForAccount = targetState;
        // Combine success handler; Do in releases_21.1_hotfix after 21.1 release
        if (targetState) {
            this.dialogs
                .wizard2FA()
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
                .off2FA(this.twoFaSystems.length)
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
        this.dialogs
            .newCode2FA();
    }
}
