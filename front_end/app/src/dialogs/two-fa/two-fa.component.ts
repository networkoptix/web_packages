import {
    Component, OnInit,
    Input, ViewChild, Renderer2,
    TemplateRef, AfterViewInit
}                                    from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }            from '@services/nx-language-provider';
import { NxConfigService, IConfig }             from '@services/nx-config';
import { NxProcessService, Process }            from '@services/process.service';
import { LanguageI18NStaticTypes }              from '@app/language_i18n_static_types';
import { Account, NxAccountService }            from '@services/account.service';
import {
    InfoBlockLine, InfoBlockSection,
    InfoBlockSize
}                                               from '@components/info-block/info-block.component';
import { NxToastService }                       from '@dialogs/toast.service';
import { ClipboardService, IClipboardResponse } from 'ngx-clipboard';
import { CloudResponse }                        from '@services/nx-cloud-api.types';
import { untilDestroyed } from '@ngneat/until-destroy';

export enum T_FA_STEPS {
    Code,
    WizardLogin,
    WizardQR,
    WizardCode,
    WizardFinish
}

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

    public templateType: TemplateRef<any>;
    public title: string;
    public newCode: string;
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
    @ViewChild('wizardLogin', { static: true }) wizardLoginTemplate: TemplateRef<any>;
    @ViewChild('wizardQR', { static: true }) wizardQRTemplate: TemplateRef<any>;
    @ViewChild('wizardCode', { static: true }) wizardCodeTemplate: TemplateRef<any>;
    @ViewChild('wizardFinish', { static: true }) wizardFinishTemplate: TemplateRef<any>;

    private resetDefaults() {
        this.newCode = '';
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
    }

    constructor(
        configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private processService: NxProcessService,
        private renderer: Renderer2,
        private accountService: NxAccountService,
        public activeModal: NgbActiveModal,
        private toastService: NxToastService,
        private clipboardService: ClipboardService
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
                return Promise.reject({ resultCode: 'missingParam' });
            }

            // try first to authenticate API -> TBD
            return this.accountService
                .verify(this.password)
                .then((result: any) => {
                    if (this.type === 'off') {
                        return Promise.resolve(result.resultCode);
                    }
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
            if (response.keyUrl) {
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
                return Promise.reject({ resultCode: 'missingParam' });
            }
            return this.accountService.toggle2fa(this.password, this.tfaCode);
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
                }
            }
        }, (response) => {
            if (response.account2faEnabled) {
                // request single use code
                this.accountService.get2FaBackupCode().then((response: any) => {
                    this.newCode = response.backup_code;
                });
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
        if (this.type === 'code') {
            this.accountService
                .get2FaBackupCode()
                .then((response: any) => {
                    this.newCode = response.backup_code;
                    this.setTemplate(T_FA_STEPS.Code);
                }, (error) => {
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
        }
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
        this.clipboardService.copy(this.newCode);
    }
}
