import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import {
    Component,
    OnInit,
    ViewChild,
    Renderer2,
    TemplateRef,
    AfterViewInit,
    Inject,
    HostListener,
    ElementRef,
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { ClipboardService, IClipboardResponse } from 'ngx-clipboard';
import { CookieService } from 'ngx-cookie-service';

import staticLang from '@common/language/language_i18n_static.json';
import { accountActions } from '@common/store/account';
import {
    InfoBlockLine,
    InfoBlockSection,
    InfoBlockSize
} from '@components/info-block/info-block.component.types';
import { NxToastService } from '@dialogs/toast.service';
import { icons, apiBase, credentialsValidation, toast } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystemsService } from '@services/systems.service';
import type { NxSystemInfo } from '@services/systems.service.types';
import { WINDOW } from '@services/window-provider';

import type { Account2faData, Account2faReturn } from '../dialogs.types';

import { TfaAction, T_FA_STEPS } from './two-fa.component.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-two-fa-modal-content',
    templateUrl: 'two-fa.component.html',
    styleUrls: ['two-fa.component.scss']
})
export class TwoFAModalContent<A extends TfaAction> implements OnInit, AfterViewInit {
    LANG = staticLang;

    TfaAction = TfaAction;
    newPassword: string;
    oldPassword: string;
    num2FaSystems: number;
    infoBlockSizeEnum = InfoBlockSize;
    apiBase: string = apiBase;
    credentialsValidation = credentialsValidation;
    icons = icons;

    private account: Account;
    currentStep: T_FA_STEPS;
    incompatibleSystems: NxSystemInfo[] = [];

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
    handleKeyboardEvent(event: KeyboardEvent): void {
        if (
            // Mobile Chrome doesn't use "code" ... maybe some others -- TT
            ['Enter', 'NumpadEnter'].includes(event.code || event.key) &&
            this.document.activeElement.tagName === 'INPUT'
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

    private resetDefaults(): void {
        this.newCodes = [];
        this.password = '';
        this.tfaCode = '';
    }

    private setupDefaults(): void {
        this.resetDefaults();
        this.account = this.accountService.account;

        this.clipboardService.copyResponse$
            .pipe(untilDestroyed(this))
            .subscribe((res: IClipboardResponse) => {
                if (res.isSuccess) {
                    this.toastService.notify(
                        this.LANG.common.copiedToClipboard,
                        toast.success,
                    );
                }
            });

        this.systemsService.systemsSubject
            .pipe(untilDestroyed(this))
            .subscribe(systems => {
                this.incompatibleSystems = systems.filter(sys => !sys.useRest);
            });
    }

    constructor(
        private processService: NxProcessService,
        private renderer: Renderer2,
        private accountService: NxAccountService,
        private toastService: NxToastService,
        private clipboardService: ClipboardService,
        private systemsService: NxSystemsService,
        private cloudApiService: NxCloudApiService,
        private elem: ElementRef<HTMLElement>,
        private cookieService: CookieService,
        protected dialogRef: DialogRef<Account2faReturn>,
        private store: Store,
        @Inject(WINDOW) private window: Window,
        @Inject(DOCUMENT) private document: Document,
        @Inject(DIALOG_DATA) protected dialogData: Account2faData<A>,
    ) {
        this.setupDefaults();

        // Type narrowing isn't quite working here
        if (dialogData.action === TfaAction.Disable) {
            const { data } = dialogData as Account2faData<TfaAction.Disable>;
            this.num2FaSystems = data.num2FaSystems;
        } else if (dialogData.action === TfaAction.PasswordChange) {
            const { data } = dialogData as Account2faData<TfaAction.PasswordChange>;
            this.oldPassword = data.oldPassword;
            this.newPassword = data.newPassword;
        }
    }

    // Using fetch api because angular http request is canceled when page is unloading.
    private removeUnverified2faKey = (): void => {
        const options = {
            method: 'delete',
            headers: {
                'x-CSRFToken': this.cookieService.get('csrftoken')
            },
            keepalive: true
        };
        fetch(`${this.apiBase}/account/security`, options)
            .catch(() => { console.error('something went wrong'); });
    };

    ngOnInit(): void {
        this.loginProcess = this.processService.createProcess(() => {
            this.lock();
            this.loginForm.controls.login_password.setErrors(undefined);
            this.wrongPassword = false;
            this.accountBlocked = false;

            if (this.password === '') {
                return Promise.reject({ resultCode: 'missingParam' });
            }

            return this.accountService
                .verify(this.password)
                .then(() => {
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
        }, response => {
            if (response?.keyUrl) {
                this.setTemplate(T_FA_STEPS.WizardQR);
                this.valueQR = response.keyUrl;
                this.code = response.keyUrl.slice(-16);
                this.credentials = new InfoBlockSection([
                    new InfoBlockLine(this.LANG.account.account, this.account.email),
                    new InfoBlockLine(this.LANG.account.key, this.code)
                ]);
            }
            this.unlock();
        }, () => {
            this.unlock();
        });

        this.qrProcess = this.processService.createProcess(() => {
            return Promise.resolve({ result: { success: true } });
        }, {
            ignoreUnauthorized: true,
            ignoreError: true
        }, response => {
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
            this.lock();
            if (this.tfaCode === '') {
                return Promise.reject({ resultCode: 'missingParam' });
            }

            // Don't need to get backup codes or refresh session when disabling
            if (this.dialogData.action === TfaAction.Disable) {
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
                        .then(result => {
                            if (result.resultCode === 'ok') {
                                return this.accountService.update2fa(
                                    this.password,
                                    this.tfaCode,
                                    'activate'
                                );
                            }

                            return Promise.reject({ resultCode: result.errorText });
                        }, err => {
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
                    this.toastService.notify(
                        this.LANG.common.generalError,
                        toast.danger,
                    );
                },
                forbidden: codeProcessUnauthorizedHandles,
                notAuthorized: codeProcessUnauthorizedHandles,
                invalidTotp: codeProcessUnauthorizedHandles
            }
        }, response => {
            if (response.account2faEnabled) {
                this.listenFor2faActivation = false;
                this.window.removeEventListener('beforeunload', this.removeUnverified2faKey);
                this.setTemplate(T_FA_STEPS.WizardFinish);
                this.unlock();
            }

            if (response.account2faEnabled === false) {
                this.resetDefaults();
                this.close('disabled');
            }
        }, () => {
            this.unlock();
        });

        this.verificationProcess = this.processService.createProcess(() => {
            if (this.tfaCode === '') {
                return Promise.reject({ resultCode: 'missingParam' });
            }

            this.lock();
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
                    this.toastService.notify(
                        this.LANG.common.generalError,
                        toast.danger
                    );
                },
                forbidden: () => {
                    this.notAuthorized = true;
                    this.codeForm.controls.tfaCodeInput.markAsTouched();
                    this.codeForm.controls.tfaCodeInput.setErrors({ invalid: true });
                    this.renderer.selectRootElement('#tfaCodeInput').focus();
                }
            }
        }, response => {
            if (response.account2faEnabled) {
                this.close('enabled');
            }

            if (response.account2faEnabled === false) {
                this.store.dispatch(
                    accountActions.updateCurrentUser({
                        update: {
                            account2faEnabled: false,
                            totpExistsForAccount: false,
                        }
                    })
                );
                this.resetDefaults();
                this.close('disabled');
            }
        }, () => {
            this.unlock();
        });

        const invalidCredentialHandler = () => {
            this.notAuthorized = true;
            this.codeForm.controls.tfaCodeInput.markAsTouched();
            this.codeForm.controls.tfaCodeInput.setErrors({ invalid: true });
            this.renderer.selectRootElement('#tfaCodeInput').focus();
        };

        this.changePasswordProcess = this.processService.createProcess(() => {
            this.lock();
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
                wrongOldPassword: invalidCredentialHandler,
                badRequest: invalidCredentialHandler,
            }
        }, res => {
            this.close(res);
        }, () => {
            this.unlock();
        });
    }

    async setTemplate(step: T_FA_STEPS): Promise<void> {
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
        setTimeout(() => {
            this.elem.nativeElement.querySelector('input')?.focus();
        });
    }

    ngAfterViewInit(): void {
        const { action } = this.dialogData;
        if (action === TfaAction.Disable) {
            this.setTemplate(T_FA_STEPS.Disable2FaCode);
        } else if (action === TfaAction.PasswordChange) {
            this.setTemplate(T_FA_STEPS.ChangePassword);
        } else if (
            action === TfaAction.CodeOnLoginEnable ||
            action === TfaAction.CodeOnLoginDisable
        ) {
            this.setTemplate(T_FA_STEPS.VerificationToggle);
        } else if (action === TfaAction.NewBackupCodes) {
            this.accountService
                .get2FaBackupCode()
                .then(response => {
                    this.newCodes = response.map(code => code.backup_code);
                    this.setTemplate(T_FA_STEPS.Code);
                }, () => {
                    this.close();
                    this.toastService.notify(
                        this.LANG.common.generalError,
                        toast.danger
                    );
                });
        } else {
            this.setTemplate(T_FA_STEPS.WizardLogin);
            // this.incompatibleSystems.length ? this.setTemplate(T_FA_STEPS.WizardWarning) : this.setTemplate(T_FA_STEPS.WizardLogin);
        }
    }

    refreshSession() {
        return this.accountService.updateSessionWith2fa(this.tfaCode);
    }

    close = (action?: Account2faReturn): void => {
        if (this.listenFor2faActivation) {
            this.window.removeEventListener('beforeunload', this.removeUnverified2faKey);
        }
        this.resetDefaults();
        this.dialogRef.close(action || 'changed');
    };

    /* Needs to be an arrow function to access this
    when passed to <nx-cancel-button> as [discardFn] */
    closeWizard = (action?: Account2faReturn): void => {
        if (this.listenFor2faActivation) {
            this.window.removeEventListener('beforeunload', this.removeUnverified2faKey);
        }
        if (action === 'deactivate') {
            this.accountService.deactivate2FaKey()
                .catch(err => {
                    console.error('2FA cleanup failed ->', err);
                });
        }
        this.resetDefaults();
        this.close('canceled');
    };

    next(): void {
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
                this.close('enabled');
                break;
            case T_FA_STEPS.VerificationToggle:
                this.verificationProcess.run();
                break;
            case T_FA_STEPS.Disable2FaCode:
                this.codeProcess.run();
        }
    }

    prev(): void {
        if (this.currentStep === T_FA_STEPS.WizardCode) {
            this.setTemplate(T_FA_STEPS.WizardQR);
        }
    }

    copyToClipboard(): void {
        this.clipboardService.copy(this.newCodes.join('\n'));
    }

    lock = (): void => { this.dialogRef.disableClose = true; };
    unlock = (): void => { this.dialogRef.disableClose = false; };
}
