import { DialogRef } from '@angular/cdk/dialog';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, forwardRef, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { QrCodeModule } from 'ng-qrcode';
import { CookieService } from 'ngx-cookie-service';

import { NxInfoBlockComponent } from '@components/info-block/info-block.component';
import {
    InfoBlockLine,
    InfoBlockSection,
    InfoBlockSize,
} from '@components/info-block/info-block.component.types';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { EnableAccount2fa as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';
import { apiBase, credentialsValidation, icons } from '@static-variables';

import { NxBackupCodesComponent } from '../backup-codes/backup-codes.component';
import { Nx2faCodeInputComponent } from '../code-input/2fa-code-input.component';

import { NxEnable2faStepperComponent } from './enable-2fa-stepper/enable-2fa-stepper.component';

@Component({
    selector: 'nx-enable-account-2fa',
    templateUrl: 'enable-account-2fa.component.html',
    styleUrls: ['enable-account-2fa.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        forwardRef(() => NxEnable2faStepperComponent),
        CdkStepperModule,

        AngularSvgIconModule,
        QrCodeModule,

        NxInfoBlockComponent,
        NxFocusMeDirective,
        NxAddSvgSrcDirective,
        Nx2faCodeInputComponent,
        NxBackupCodesComponent,
        NxProcessButtonComponent,
    ],
})
export class NxEnableAccount2faModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;
    credentialsValidation = credentialsValidation;
    icons = icons;

    @ViewChild('loginForm') private loginForm: NgForm;
    @ViewChild('tfaCodeInput') private tfaCodeInput: Nx2faCodeInputComponent;
    selectedIndex: number = 0;

    /** Whether the user can close the dialog with X button */
    xable: boolean = true;

    disablePwInput = false;

    wrongPassword: boolean;
    accountBlocked: boolean;

    password: string;
    passwordProcess: Process;

    showQR: boolean = true;
    valueQR: string;
    InfoBlockSize = InfoBlockSize;
    credentials: InfoBlockSection;

    tfaCode: string;
    codeProcess: Process;
    newCodes: string[];

    constructor(
        dialogRef: DialogRef<DT['return']>,
        processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private cookieService: CookieService,
        private self: ElementRef<HTMLElement>,
        accountService: NxAccountService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        this.passwordProcess = processService.createProcess(
            () => {
                this.loginForm.controls.login_password.setErrors(undefined);
                this.wrongPassword = false;
                this.accountBlocked = false;
                dialogRef.disableClose = true;
                this.disablePwInput = true;
                this.lock();
                return cloudApiService.verify(this.password).then(() => {
                    window.addEventListener('beforeunload', this.removeUnverified2faKey);
                    return cloudApiService.get2FaKey();
                });
            },
            {
                ignoreUnauthorized: true,
                ignoreError: true,
                errorCodes: {
                    notAuthorized: () => {
                        this.wrongPassword = true;
                        this.loginForm.controls.login_password.setErrors({
                            nx_wrong_password: true,
                        });
                        this.password = '';

                        this.focusInput();
                    },
                    missingParam: () => {
                        this.loginForm.controls.login_password.markAsTouched();
                        this.loginForm.controls.login_password.setErrors({ required: true });
                        this.focusInput();
                    },
                    accountBlocked: () => {
                        this.loginForm.controls.login_password.markAsPristine();
                        this.loginForm.controls.login_password.markAsUntouched();

                        this.accountBlocked = true;
                        this.loginForm.controls.login_password.setErrors({
                            nx_account_blocked: true,
                        });
                    },
                },
            },
            response => {
                this.valueQR = response.keyUrl;
                const code = response.keyUrl.slice(-16);
                this.credentials = new InfoBlockSection([
                    new InfoBlockLine(this.LANG.account.account, accountService.email),
                    new InfoBlockLine(this.LANG.account.key, code),
                ]);
                this.next();
                this.unlock();
                // Don't re-enable quick close once user proceeds past first step
            },
            () => {
                this.disablePwInput = false;
                dialogRef.disableClose = false;
                this.unlock();
            },
        );

        this.codeProcess = processService.createProcess(
            () => {
                this.tfaCodeInput.disable();
                this.lock();
                // request backup codes before 2fa toggle (after 2fa is ON user have to re-login)
                return this.cloudApiService.get2FaBackupCode().then(response => {
                    this.newCodes = response.map(code => code.backup_code);

                    return this.cloudApiService.updateSessionWith2fa(this.tfaCode).then(
                        result => {
                            if (result.resultCode === 'ok') {
                                return this.cloudApiService.update2fa(
                                    this.password,
                                    this.tfaCode,
                                    'activate',
                                );
                            }

                            /* 200 {
                                "resultCode": "invalidTotp",
                                "errorText": "Wrong totp",
                                "errorData": {
                                    "errorClass": "internalError",
                                    "errorDetail": "119",
                                    "errorText": "Wrong totp",
                                    "resultCode": "invalidTotp"
                                }
                            } */
                            return Promise.reject({ resultCode: result.resultCode });
                        },
                        err => {
                            return Promise.reject({ resultCode: err.error.resultCode });
                        },
                    );
                });
            },
            {
                ignoreUnauthorized: true,
                ignoreError: true,
                errorCodes: {
                    noBackupCodes: () => {
                        toastService.notify(this.LANG.common.generalError, ToastType.Danger);
                    },
                    forbidden: () => this.tfaCodeInput.setUnauthorized(),
                    notAuthorized: () => this.tfaCodeInput.setUnauthorized(),
                    invalidTotp: () => this.tfaCodeInput.setUnauthorized(),
                },
            },
            () => {
                window.removeEventListener('beforeunload', this.removeUnverified2faKey);
                this.next();
                this.unlock();
            },
            () => {
                this.tfaCodeInput.enable();
                this.unlock();
            },
        );
    }

    markAsDirty = (): void => {
        this.tfaCodeInput.markAsDirty();
    };

    // Using fetch api because angular http request is canceled when page is unloading.
    private removeUnverified2faKey = (): void => {
        const options = {
            method: 'delete',
            headers: {
                'x-CSRFToken': this.cookieService.get('csrftoken'),
            },
            keepalive: true,
        };
        fetch(`${apiBase}/account/security`, options).catch(() => {
            console.error('something went wrong');
        });
    };

    focusInput(): void {
        setTimeout(() => {
            this.self.nativeElement.querySelector('input')?.focus();
        });
    }

    prev(): void {
        this.selectedIndex -= 1;
    }

    next(): void {
        this.selectedIndex += 1;
        this.focusInput();
    }

    override lock = (): void => {
        this.xable = false;
    };

    override unlock = (): void => {
        this.xable = true;
    };

    override close = (): void => {
        if (this.selectedIndex === 0) {
            this.dialogRef.close();
        } else if (this.selectedIndex > 0 && this.selectedIndex < 3) {
            // Cleanup if user closes dialog after entering password and before entering code
            window.removeEventListener('beforeunload', this.removeUnverified2faKey);
            this.cloudApiService.deactivate2FaKey().catch(err => {
                console.error('2FA cleanup failed ->', err);
            });
            this.dialogRef.close();
        } else {
            this.dialogRef.close(true);
        }
    };
}
