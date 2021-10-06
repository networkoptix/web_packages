import {
    Component, OnInit,
    Input, ViewChild, Renderer2,
    TemplateRef, AfterViewInit
}                                                 from '@angular/core';
import { NgbActiveModal }                         from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }              from '@services/nx-language-provider';
import { NxConfigService, IConfig }               from '@services/nx-config';
import { NxProcessService, Process }              from '@services/process.service';
import { LanguageI18NStaticTypes }                from '@app/language_i18n_static_types';
import { Account, NxAccountService }              from '@services/account.service';
import {
    InfoBlockLine, InfoBlockSection,
    InfoBlockSize
}                                                 from '@components/info-block/info-block.component';
import { NxToastService }                         from '@dialogs/toast.service';
import { ClipboardService, IClipboardResponse }   from 'ngx-clipboard';
import { UntilDestroy, untilDestroyed }           from '@ngneat/until-destroy';
import { NxSystemsService, NxSystemWithUserInfo } from '@services/systems.service';
import { NxUtilsService }                         from '@services/utils.service';

export enum T_FA_STEPS {
    Code,
    // WizardWarning,
    WizardLogin,
    WizardQR,
    WizardCode,
    WizardFinish
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'two-fa-modal-content',
    templateUrl : 'two-fa.component.html',
    styleUrls   : ['two-fa.component.scss']
})
export class TwoFAModalContent implements OnInit, AfterViewInit {
    @Input() type;
    @Input() cancellable;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    infoBlockSizeEnum = InfoBlockSize;

    account: Account;
    currentStep: T_FA_STEPS;
    incompatibleSystems: NxSystemWithUserInfo[] = [];

    public templateType: TemplateRef<any>;
    public title: string;
    public newCodes: string[];
    public scrambledIndexes: number[] = [1, 5, 2, 6, 3, 7, 4, 8];
    public password: string;
    public loginProcess: Process;
    public qrProcess: Process;
    public codeProcess: Process;
    public hideErrors = true;

    public wrongPassword: boolean;
    public accountBlocked: boolean;
    public credentials: InfoBlockSection;

    public showQR = true;
    public valueQR: string;
    public tfaCode: string;

    private accessCode: string;

    // static property is needed for unit tests
    @ViewChild('loginForm') loginForm: HTMLFormElement;
    @ViewChild('codeForm') codeForm: HTMLFormElement;

    @ViewChild('code', { static: true }) codeTemplate: TemplateRef<any>;
    // @ViewChild('wizardWarning', { static: true }) wizardWarningTemplate: TemplateRef<any>;
    @ViewChild('wizardLogin', { static: true }) wizardLoginTemplate: TemplateRef<any>;
    @ViewChild('wizardQR', { static: true }) wizardQRTemplate: TemplateRef<any>;
    @ViewChild('wizardCode', { static: true }) wizardCodeTemplate: TemplateRef<any>;
    @ViewChild('wizardFinish', { static: true }) wizardFinishTemplate: TemplateRef<any>;

    private resetDefaults() {
        this.newCodes = [];
        this.password = '';
        this.tfaCode = '';
    }

    private setupDefaults() {
        this.resetDefaults();
        this.account = this.accountService.account;

        this.clipboardService.copyResponse$
            .pipe(untilDestroyed(this))
            .subscribe((res: IClipboardResponse) => {
                if (res.isSuccess) {
                    const options = {
                        classname : this.CONFIG.toast.success,
                        autohide  : true,
                        delay     : this.CONFIG.alertTimeout
                    };
                    this.toastService.show(this.LANG.common.copiedToClipboard(), options);
                }
            });

        this.systemsService.systemsSubject
            .pipe(untilDestroyed(this))
            .subscribe((systems: NxSystemWithUserInfo[]) => {
                systems.forEach(system => {
                    const isVersion43 = Object.keys(system.capabilities).some((capability) => {
                        return capability.includes('4_3');
                    });

                    if (!isVersion43) {
                        system.name = NxUtilsService.htmlToEntity(system.name);
                        this.incompatibleSystems.push(system);
                    }
                });
            });
    }

    constructor(
        configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private processService: NxProcessService,
        private renderer: Renderer2,
        private accountService: NxAccountService,
        public activeModal: NgbActiveModal,
        private toastService: NxToastService,
        private clipboardService: ClipboardService,
        private systemsService: NxSystemsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.languageService.translations;

        this.setupDefaults();
    }

    ngOnInit() {
        this.loginProcess = this.processService.createProcess(() => {
            this.loginForm.controls.login_password.setErrors(undefined);
            this.wrongPassword = false;
            this.accountBlocked = false;

            if (this.password === '') {
                // eslint-disable-next-line prefer-promise-reject-errors
                return Promise.reject({ resultCode: 'missingParam' });
            }

            // try first to authenticate API -> TBD
            if (this.type === 'off') {
                return Promise.resolve();
            }
            return this.accountService
                .verify(this.password)
                .then((result: any) => {
                    return this.accountService.get2FaKey();
                });
        }, {
            ignoreUnauthorized : true,
            ignoreError        : true,
            errorCodes         : {
                notAuthorized: () => {
                    this.wrongPassword = true;
                    this.loginForm.controls.login_password.setErrors({ nx_wrong_password: true });
                    this.password = '';

                    this.renderer.selectRootElement('#login_password').focus();
                },
                missingParam: () => {
                    this.loginForm.controls.login_password.markAsTouched();
                    this.loginForm.controls.login_password.setErrors({ required: true });
                    this.renderer.selectRootElement('#login_password').focus();
                },
                accountBlocked: () => {
                    this.loginForm.controls.login_password.markAsPristine();
                    this.loginForm.controls.login_password.markAsUntouched();

                    this.accountBlocked = true;
                    this.loginForm.controls.login_password.setErrors({ nx_account_blocked: true });
                }
            }
        }, (response) => {
            if (response?.keyUrl) {
                this.setTemplate(T_FA_STEPS.WizardQR);
                this.valueQR = response.keyUrl;
                this.accessCode = response.keyUrl.slice(-16);
                this.credentials = new InfoBlockSection([
                    new InfoBlockLine(this.LANG.account.account(), this.account.email),
                    new InfoBlockLine(this.LANG.account.key(), this.accessCode)
                ]);
            } else {
                // type "off" go to totp
                this.setTemplate(T_FA_STEPS.WizardCode);
            }
        });

        this.qrProcess = this.processService.createProcess(() => {
            return Promise.resolve({ result: { success: true } });
        }, {
            ignoreUnauthorized : true,
            ignoreError        : true
        }, (response) => {
            if (response.result.success) {
                this.setTemplate(T_FA_STEPS.WizardCode);
            }
        });

        this.codeProcess = this.processService.createProcess(() => {
            if (this.tfaCode === '') {
                // eslint-disable-next-line prefer-promise-reject-errors
                return Promise.reject({ resultCode: 'missingParam' });
            }
            // request backup codes before 2fa toggle (after 2fa is ON user have to re-login)
            return this.accountService.get2FaBackupCode().then((response: any) => {
                if (response.errorText !== undefined) {
                    // eslint-disable-next-line prefer-promise-reject-errors
                    return Promise.reject({ resultCode: 'noBackupCodes' });
                }
                this.newCodes = response.map(code => code.backup_code);

                return this.refreshSession()
                    .then((result) => {
                        if (result.resultCode === 'ok') {
                            return this.accountService.toggle2fa(this.password, this.tfaCode);
                        }
                        // eslint-disable-next-line prefer-promise-reject-errors
                        return Promise.reject({ resultCode: result.errorText });
                    }, (error) => {
                        // eslint-disable-next-line prefer-promise-reject-errors
                        return Promise.reject({ resultCode: error });
                    });
            });
        }, {
            ignoreUnauthorized : true,
            ignoreError        : true,
            errorCodes         : {
                accountBlocked: () => {
                    this.accountBlocked = true;
                    this.codeForm.controls.tfaCodeInput.setErrors({ nx_account_blocked: true });
                    this.renderer.selectRootElement('#login_password').focus();
                },
                missingParam: () => {
                    this.codeForm.controls.tfaCodeInput.markAsTouched();
                    this.codeForm.controls.tfaCodeInput.setErrors({ required: true });
                    this.renderer.selectRootElement('#tfaCodeInput').focus();
                },
                noBackupCodes: () => {
                    const options = {
                        classname : this.CONFIG.toast.danger,
                        autohide  : true,
                        delay     : this.CONFIG.alertTimeout
                    };
                    this.toastService.show(this.LANG.common.generalError(), options);
                }
            }
        }, (response) => {
            if (response.account2faEnabled) {
                this.setTemplate(T_FA_STEPS.WizardFinish);
            }

            if (response.account2faEnabled === false) {
                this.resetDefaults();
                this.activeModal.close('disabled');
            }
        });
    }

    setTemplate(step) {
        this.currentStep = step;
        switch (step) {
            case T_FA_STEPS.Code:
                this.templateType = this.codeTemplate;
                break;
            // case T_FA_STEPS.WizardWarning:
            //     this.templateType = this.wizardWarningTemplate;
            //     break;
            case T_FA_STEPS.WizardLogin:
                this.templateType = this.wizardLoginTemplate;
                break;
            case T_FA_STEPS.WizardQR:
                this.templateType = this.wizardQRTemplate;
                break;
            case T_FA_STEPS.WizardCode:
                this.templateType = this.wizardCodeTemplate;
                break;
            case T_FA_STEPS.WizardFinish:
                this.templateType = this.wizardFinishTemplate;
                break;
        }
    }

    ngAfterViewInit() {
        if (this.type === 'off') {
            this.setTemplate(T_FA_STEPS.WizardLogin);
        } else if (this.type === 'code') {
            this.accountService
                .get2FaBackupCode()
                .then((response: any) => {
                    this.newCodes = response.map(code => code.backup_code);
                    this.setTemplate(T_FA_STEPS.Code);
                }, () => {
                    this.activeModal.close();
                    const options = {
                        classname : this.CONFIG.toast.danger,
                        autohide  : true,
                        delay     : this.CONFIG.alertTimeout
                    };
                    this.toastService.show(this.LANG.common.generalError(), options);
                });
        } else {
            this.setTemplate(T_FA_STEPS.WizardLogin);
            // this.incompatibleSystems.length ? this.setTemplate(T_FA_STEPS.WizardWarning) : this.setTemplate(T_FA_STEPS.WizardLogin);
        }
    }

    refreshSession() {
        return this.accountService.updateSessionWith2fa(this.tfaCode);
    }

    close() {
        this.resetDefaults();
        this.activeModal.close('changed');
    }

    closeWizard() {
        this.resetDefaults();
        this.activeModal.close('canceled');
    }

    next() {
        switch (this.currentStep) {
            // case T_FA_STEPS.WizardWarning:
            //     this.setTemplate(T_FA_STEPS.WizardLogin);
            //     break;
            case T_FA_STEPS.WizardLogin:
                this.loginProcess.run();
                break;
            case T_FA_STEPS.WizardQR:
                this.qrProcess.run();
                break;
            case T_FA_STEPS.WizardCode:
                this.codeProcess.run();
                break;
            case T_FA_STEPS.WizardFinish:
                this.activeModal.close('enabled');
                break;
        }
    }

    prev() {
        if (this.currentStep === T_FA_STEPS.WizardCode) {
            this.setTemplate(T_FA_STEPS.WizardQR);
        }
    }

    copyToClipboard() {
        this.clipboardService.copy(this.newCodes.join('\n'));
    }
}
