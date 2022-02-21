import { DOCUMENT } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    HostListener,
    Inject,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
    ViewContainerRef
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { PopoverRef } from '@components/popover/popover-ref';
import { NxPopoverService } from '@components/popover/popover.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { Account, NxAccountService } from '@services/account.service';
import { NxApplyService, Watcher } from '@services/apply.service';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { NxSystemsService, NxSystemWithUserInfo } from '@services/systems.service';
import { NxUtilsService } from '@services/utils.service';
import { NxMenuService } from '@src/menu';

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
    totpExistsForAccount: boolean;

    twoFaSystems: NxSystemWithUserInfo[] = [];
    subV5Systems: NxSystemWithUserInfo[] = [];

    targets: object[] = [];
    popover: PopoverRef;

    verificationWatcher = new Watcher<boolean>();

    @ViewChild('twoFaSystemsSpan') twoFaSystemsSpan: ElementRef;
    @ViewChild('v5WarningSpan') v5WarningSpan: ElementRef;
    @ViewChild('popLegend2faTemplate') popLegend2faTemplate: TemplateRef<any>;
    @ViewChild('popLegendSubV5Template') popLegendSubV5Template: TemplateRef<any>;
    @ViewChild('applyContainer', { read: ViewContainerRef, static: true }) applyContainer;

    private setupDefaults() {
        this.menuService.detail = 'security';
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private accountService: NxAccountService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private pageService: NxPageService,
        private systemsService: NxSystemsService,
        private popoverService: NxPopoverService,
        private _viewContainerRef: ViewContainerRef,
        @Inject(DOCUMENT) private document: Document,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pageService.pageTitle = this.LANG.pageTitles.security;
        this.account = this.accountService.account;

        this.account2faEnabled = this.account.account2faEnabled;
        this.totpExistsForAccount = this.account.totpExistsForAccount;
        this.verificationWatcher.value = this.account2faEnabled;

        this.systemsService.systemsSubject
            .pipe(untilDestroyed(this))
            .subscribe((systems: NxSystemWithUserInfo[]) => {
                const twoFaSystems: NxSystemWithUserInfo[] = [];
                const subV5Systems: NxSystemWithUserInfo[] = [];
                systems.forEach(system => {
                    system.name = NxUtilsService.htmlToEntity(system.name);

                    if (system.system2faEnabled) {
                        twoFaSystems.push(system);
                    }

                    if (!system.useRest) {
                        subV5Systems.push(system);
                    }
                });
                this.twoFaSystems = twoFaSystems;
                this.subV5Systems = subV5Systems;

                this.clearPopoverTargets();
                this.setPopoverTargets();
            });

        this.applyService.initPageWatcher(
            this.applyContainer,
            this.processService.createProcess(
                () => {
                    return this.dialogs
                        .toggleVerificationCode(this.verificationWatcher.value)
                        .then(action => {
                            if (action === 'canceled') {
                                return Promise.reject('dialogCancel');
                            } else {
                                this.account2faEnabled = (action === 'enabled');
                                this.updateVerificationOriginal();
                                this.accountService.get(true).catch((e) => {});
                            }
                        });
                },
                { errorCodes: { dialogCancel: () => {} } },
                () => {},
                () => {}
            ),
            () => {
                this.applyService.reset();
            },
            [this.verificationWatcher],
            undefined,
            undefined,
            true
        );
    }

    private clearPopoverTargets() {
        this.targets = NxUtilsService.clearPseudoAnchors(this.targets);

        if (this.popover) {
            this.popover.close();
            this.popover = undefined;
        }
    }

    private setPopoverTargets() {
        if (this.subV5Systems.length && this.v5WarningSpan) {
            const targetV5 = this.v5WarningSpan.nativeElement.querySelector('span#targetV5');
            NxUtilsService.addPseudoAnchor(
                this.targets,
                targetV5,
                this.popLegendSubV5Template,
                'click',
                this.showPopoverWithTemplate.bind(this));
        }

        if (this.twoFaSystems.length && this.twoFaSystemsSpan) {
            const target2FaSystems = this.twoFaSystemsSpan.nativeElement.querySelector('span#target2FaSystems');
            NxUtilsService.addPseudoAnchor(
                this.targets,
                target2FaSystems,
                this.popLegend2faTemplate,
                'click',
                this.showPopoverWithTemplate.bind(this));
        }
    }

    ngAfterViewInit() {
        // popover targets are in ngIf blocks and need to be "translated" first
        // ... we need to wait before set them
        setTimeout(() => { this.setPopoverTargets(); });
    }

    showPopoverWithTemplate(template: TemplateRef<any>, target: any): void {
        if (this.popover) {
            this.popover.close();

            if (this.popover.targetId === target.id) {
                this.popover = undefined;
                return;
            }
        }
        this.popover = this.popoverService.open(
            template,
            target,
            {
                panelClass: 'system-popover',
            },
            this._viewContainerRef);
    }

    @HostListener('document:click', ['$event.target'])
    onMouseClick(targetElement) {
        if (targetElement.className !== 'pseudo-anchor' && this.popover) {
            this.popover.close();
            this.popover = undefined;
        }
    }

    ngOnDestroy() {
        this.clearPopoverTargets();
    }

    updateVerificationOriginal(newValue?: boolean): void {
        if (newValue !== undefined) {
            this.verificationWatcher.value = newValue;
        }
        this.verificationWatcher.originalValue = this.verificationWatcher.value;
    }

    switchToggle(targetState: boolean) {
        this.account2faEnabled = targetState;
        this.totpExistsForAccount = targetState;

        if (targetState) {
            this.dialogs
                .wizard2FA()
                .then((action) => {
                    const newState = (action === 'enabled');
                    this.account2faEnabled = newState;
                    this.totpExistsForAccount = newState;
                    this.updateVerificationOriginal(newState);
                    this.applyService.reset();
                });
        } else {
            this.dialogs
                .off2FA(this.twoFaSystems.length)
                .then((action) => {
                    const newState = !(action === 'disabled');
                    this.account2faEnabled = newState;
                    this.totpExistsForAccount = newState;
                    this.updateVerificationOriginal(newState);
                    this.applyService.reset();
                });
        }
    }

    genNewCode() {
        this.dialogs
            .newCode2FA();
    }
}
