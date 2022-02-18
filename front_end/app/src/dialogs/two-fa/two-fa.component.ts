import {
    Component,
    OnInit,
    Input,
    ViewChild,
    Renderer2,
    TemplateRef,
    AfterViewInit,
    HostListener,
    ElementRef,
    Inject,
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { ClipboardService, IClipboardResponse } from 'ngx-clipboard';
import { CookieService } from 'ngx-cookie-service';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import {
    InfoBlockLine,
    InfoBlockSection,
    InfoBlockSize
} from '@components/info-block/info-block.component';
import { NxToastService } from '@dialogs/toast.service';
import { Account, NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystemsService, NxSystemWithUserInfo } from '@services/systems.service';
import { NxUtilsService } from '@services/utils.service';
import { WINDOW } from '@services/window-provider';

export enum T_FA_STEPS {
    ChangePassword,
    Code,
    // WizardWarning,
    WizardLogin,
    WizardQR,
    WizardCode,
    WizardFinish,
    VerificationToggle,
    Disable2FaCode
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'two-fa-modal-content',
    templateUrl: 'two-fa.component.html',
    styleUrls: ['two-fa.component.scss']
})
export class TwoFAModalContent implements OnInit, AfterViewInit {
    @Input() type: string;
    @Input() cancellable: boolean;
    @Input() closable: boolean;
    @Input() newPassword: string;
    @Input() oldPassword: string;
    @Input() num2FaSystems: number;

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
    public changePasswordProcess: Process;
    public loginProcess: Process;
    public qrProcess: Process;
    public codeProcess: Process;
    public verificationProcess: Process;
    public hideErrors = true;

    public wrongPassword: boolean;
    public accountBlocked: boolean;
    public notAuthorized: boolean;
    public credentials: InfoBlockSection;

    public showQR = true;
    public valueQR: string;
    public tfaCode: string;

    private code: string;
    private listenFor2faActivation = false;

    // static property is needed for unit tests
    @ViewChild('loginForm') loginForm: NgForm;
    @ViewChild('codeForm') codeForm: NgForm;

    @ViewChild('changePassword', { static: true }) changePasswordTemplate: TemplateRef<any>;
    @ViewChild('code', { static: true }) codeTemplate: TemplateRef<any>;
    // @ViewChild('wizardWarning', { static: true }) wizardWarningTemplate: TemplateRef<any>;
    @ViewChild('wizardLogin', { static: true }) wizardLoginTemplate: TemplateRef<any>;
    @ViewChild('wizardQR', { static: true }) wizardQRTemplate: TemplateRef<any>;
    @ViewChild('wizardCode', { static: true }) wizardCodeTemplate: TemplateRef<any>;
    @ViewChild('wizardFinish', { static: true }) wizardFinishTemplate: TemplateRef<any>;

    @ViewChild('verificationToggle', { static: true }) verificationToggleTemplate: TemplateRef<any>;

    @ViewChild('disable2FaCode', { static: true }) disable2FaCodeTemplate: TemplateRef<any>;

    @HostListener('document:keypress', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (
            ['Enter', 'NumpadEnter'].includes(event.code) &&
            document.activeElement.tagName === 'INPUT'
        ) {
            const processButton = this.elem.nativeElement
                .querySelector<HTMLButtonElement>('.on-keypress-enter');
            if (!processButton.classList.contains('processing')) {
                processButton.click();
            }
            /* <nx-process-button> hides from user clicks when running its
            process with visibility: hidden, but this doesn't hide from
            .querySelector() or programmatic clicks */
        }
    }

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
                        classname: this.CONFIG.toast.success,
                        autohide: true,
                        delay: this.CONFIG.alertTimeout
                    };
                    this.toastService.show(this.LANG.common.copiedToClipboard(), options);
                }
            });

        this.systemsService.systemsSubject
            .pipe(untilDestroyed(this))
            .subscribe((systems: NxSystemWithUserInfo[]) => {
                systems.forEach(system => {
                    if (!system.useRest) {
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
        private systemsService: NxSystemsService,
        private cloudApiService: NxCloudApiService,
        private elem: ElementRef<HTMLElement>,
        private cookieService: CookieService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.languageService.translations;

        this.setupDefaults();
    }

    // Using fetch api because angular http request is canceled when page is unloading.
    private removeUnverified2faKey = () => {
        const options = {
            method: 'delete',
            headers: {
                'x-CSRFToken': this.cookieService.get('csrftoken')
            },
            keepalive: true
        };
        fetch(`${this.CONFIG.apiBase}/account/security`, options)
            .catch(() => { console.error('something went wrong'); });
    };

    ngOnInit() {
        this.loginProcess = this.processService.createProcess(() => {
            this.loginForm.controls.login_password.setErrors(undefined);
            this.wrongPassword = false;
            this.accountBlocked = false;

            if (this.password === '') {
                return Promise.reject({ resultCode: 'missingParam' });
            }

            return this.accountService
                .verify(this.password)
                .then((result: any) => {
                    this.listenFor2faActivation = true;
                    this.window.addEventListener('beforeunload', this.removeUnverified2faKey);
                    return this.accountService.get2FaKey();
                });
        }, {
            ignoreUnauthorized: true,
            ignoreError: true,
            errorCodes: {
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
                this.code = response.keyUrl.slice(-16);
                this.credentials = new InfoBlockSection([
                    new InfoBlockLine(this.LANG.account.account(), this.account.email),
                    new InfoBlockLine(this.LANG.account.key(), this.code)
                ]);
            }
        });

        this.qrProcess = this.processService.createProcess(() => {
            return Promise.resolve({ result: { success: true } });
        }, {
            ignoreUnauthorized: true,
            ignoreError: true
        }, (response) => {
            if (response.result.success) {
                this.setTemplate(T_FA_STEPS.WizardCode);
            }
        });

        const codeProcessUnauthorizedHandles = () => {
            this.notAuthorized = true;
            this.codeForm.controls.tfaCodeInput.markAsTouched();
            this.codeForm.controls.tfaCodeInput.setErrors({ invalid: true });
            this.renderer.selectRootElement('#tfaCodeInput').focus();
        };

        this.codeProcess = this.processService.createProcess(() => {
            if (this.tfaCode === '') {
                return Promise.reject({ resultCode: 'missingParam' });
            }

            // Don't need to get backup codes or refresh session when disabling
            if (this.type === '2fa-off') {
                return this.accountService.update2fa(
                    '',
                    this.tfaCode,
                    'deactivate'
                );
            } else {
                // request backup codes before 2fa toggle (after 2fa is ON user have to re-login)
                return this.accountService.get2FaBackupCode().then((response: any) => {
                    if (response.errorText !== undefined) {
                        return Promise.reject({ resultCode: 'noBackupCodes' });
                    }
                    this.newCodes = response.map(code => code.backup_code);

                    return this.refreshSession()
                        .then((result) => {
                            if (result.resultCode === 'ok') {
                                return this.accountService.update2fa(
                                    this.password,
                                    this.tfaCode,
                                    'activate'
                                );
                            }

                            return Promise.reject({ resultCode: result.errorText });
                        }, (err) => {
                            return Promise.reject({ resultCode: err.error.resultCode });
                        });
                });
            }
        }, {
            ignoreUnauthorized: true,
            ignoreError: true,
            errorCodes: {
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
                        classname: this.CONFIG.toast.danger,
                        autohide: true,
                        delay: this.CONFIG.alertTimeout
                    };
                    this.toastService.show(this.LANG.common.generalError(), options);
                },
                forbidden: codeProcessUnauthorizedHandles,
                notAuthorized: codeProcessUnauthorizedHandles,
                invalidTotp: codeProcessUnauthorizedHandles
            }
        }, (response) => {
            if (response.account2faEnabled) {
                this.listenFor2faActivation = false;
                this.window.removeEventListener('beforeunload', this.removeUnverified2faKey);
                this.setTemplate(T_FA_STEPS.WizardFinish);
            }

            if (response.account2faEnabled === false) {
                this.resetDefaults();
                this.activeModal.close('disabled');
            }
        });

        this.verificationProcess = this.processService.createProcess(() => {
            if (this.tfaCode === '') {
                return Promise.reject({ resultCode: 'missingParam' });
            }

            return this.accountService.update2fa('', this.tfaCode, 'toggle');
        }, {
            ignoreUnauthorized: true,
            ignoreError: true,
            errorCodes: {
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
                        classname: this.CONFIG.toast.danger,
                        autohide: true,
                        delay: this.CONFIG.alertTimeout
                    };
                    this.toastService.show(this.LANG.common.generalError(), options);
                },
                forbidden: () => {
                    this.notAuthorized = true;
                    this.codeForm.controls.tfaCodeInput.markAsTouched();
                    this.codeForm.controls.tfaCodeInput.setErrors({ invalid: true });
                    this.renderer.selectRootElement('#tfaCodeInput').focus();
                }
            }
        }, (response) => {
            if (response.account2faEnabled) {
                this.activeModal.close('enabled');
            }

            if (response.account2faEnabled === false) {
                this.account.account2faEnabled = false;
                this.account.totpExistsForAccount = false;
                this.resetDefaults();
                this.activeModal.close('disabled');
            }
        });

        const invalidCredentialHandler = () => {
            this.notAuthorized = true;
            this.codeForm.controls.tfaCodeInput.markAsTouched();
            this.codeForm.controls.tfaCodeInput.setErrors({ invalid: true });
            this.renderer.selectRootElement('#tfaCodeInput').focus();
        };

        this.changePasswordProcess = this.processService.createProcess(() => {
            return this.cloudApiService.changePassword(this.newPassword, this.oldPassword, this.tfaCode);
        }, {
            ignoreUnauthorized: true,
            ignoreError: true,
            errorCodes: {
                accountBlocked: () => {
                    this.accountBlocked = true;
                    this.codeForm.controls.tfaCodeInput.setErrors({ nx_account_blocked: true });
                },
                missingParam: () => {
                    this.codeForm.controls.tfaCodeInput.markAsTouched();
                    this.codeForm.controls.tfaCodeInput.setErrors({ required: true });
                    this.renderer.selectRootElement('#tfaCodeInput').focus();
                },
                notAuthorized: invalidCredentialHandler,
                wrongOldPassword: invalidCredentialHandler
            }
        }, (res) => {
            this.activeModal.close(res);
        });
    }

    async setTemplate(step) {
        await new Promise(resolve => setTimeout(resolve)); // sleep
        this.currentStep = step;
        switch (step) {
            case T_FA_STEPS.ChangePassword:
                this.templateType = this.changePasswordTemplate;
                break;
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
            case T_FA_STEPS.VerificationToggle:
                this.templateType = this.verificationToggleTemplate;
                break;
            case T_FA_STEPS.Disable2FaCode:
                this.templateType = this.disable2FaCodeTemplate;
                break;
        }
    }

    ngAfterViewInit() {
        if (this.type === '2fa-off') {
            this.setTemplate(T_FA_STEPS.Disable2FaCode);
        } else if (this.type === 'changePassword') {
            this.setTemplate(T_FA_STEPS.ChangePassword);
        } else if (this.type.startsWith('verification')) {
            this.setTemplate(T_FA_STEPS.VerificationToggle);
        } else if (this.type === 'code') {
            this.accountService
                .get2FaBackupCode()
                .then((response: any) => {
                    this.newCodes = response.map(code => code.backup_code);
                    this.setTemplate(T_FA_STEPS.Code);
                }, () => {
                    this.activeModal.close();
                    const options = {
                        classname: this.CONFIG.toast.danger,
                        autohide: true,
                        delay: this.CONFIG.alertTimeout
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

    close(action?) {
        if (this.listenFor2faActivation) {
            this.window.removeEventListener('beforeunload', this.removeUnverified2faKey);
        }
        this.resetDefaults();
        this.activeModal.close(action || 'changed');
    }

    /* Needs to be an arrow function to access this
    when passed to <nx-cancel-button> as [discardFn] */
    closeWizard = (action?) => {
        if (this.listenFor2faActivation) {
            this.window.removeEventListener('beforeunload', this.removeUnverified2faKey);
        }
        if (action === 'deactivate') {
            this.accountService.deactivate2FaKey()
                .catch((err) => {
                    console.error('2FA cleanup failed ->', err);
                });
        }
        this.resetDefaults();
        this.activeModal.close('canceled');
    }

    next() {
        switch (this.currentStep) {
            case T_FA_STEPS.ChangePassword:
                this.changePasswordProcess.run();
                break;
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
            case T_FA_STEPS.VerificationToggle:
                this.verificationProcess.run();
                break;
            case T_FA_STEPS.Disable2FaCode:
                this.codeProcess.run();
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
