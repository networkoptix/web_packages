import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild, ElementRef } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

import staticLang from '@common/language/language_i18n_static.json';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { UpdateSession as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { environment } from '@environments/environment';
import { alertTimeout } from '@lib/variables/static-variables';
import { NxLoginService } from '@services/login.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';
import { htmlStrConstructor } from '@utils/nx';

@Component({
    selector: 'nx-update-session',
    templateUrl: 'update-session.component.html',
    styleUrls: ['update-session.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class NxUpdateSessionModalContent extends ModalBase<DT['return']> {
    processAction: string;

    login: Process;

    @ViewChild('loginForm', { static: true }) loginForm: NgForm;

    // This variable is used in three states: undefined, true, false.
    // As variable is resolved async, "undefined" is used to prevent
    // showing wrong dialog content.
    isCloud: boolean;

    auth = {
        login: '',
        password: '',
    };

    flags = {
        accountBlocked: false,
        hideErrors: false,
        wrongCredentials: false,
    };

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA)
        { sessionState, system, noConnectionMsg, openingRef, processAction }: DT['data'],
        @Inject(WINDOW) private window: Window,
        processService: NxProcessService,
        toastService: NxToastService,
        loginService: NxLoginService,
        self: ElementRef<HTMLElement>,
        translate: TranslateService,
    ) {
        super(dialogRef);
        this.processAction = processAction;
        Promise.all([
            system.mediaserver.getCurrentUser(),
            system.mediaserver.getModuleInfo().toPromise(),
        ])
            .then(([account, serverInfo]) => {
                const moduleInfo = serverInfo?.reply;
                this.auth.login = account.name;
                this.isCloud = system.mediaserver.isSessionOauth;

                if (
                    this.isCloud &&
                    !(
                        this.window.navigator.onLine ||
                        moduleInfo?.serverFlags.includes('SF_HasPublicIP')
                    )
                ) {
                    this.close();
                    openingRef?.close();

                    let msg: string;
                    if (noConnectionMsg) {
                        msg = htmlStrConstructor(
                            [
                                /* Using <div> to avoid global bottom margin on <p> */
                                { name: 'div', children: [{ value: noConnectionMsg }] },
                                {
                                    name: 'div',
                                    children: [{ value: staticLang.toastMessage.noConnection }],
                                },
                            ],
                            translate,
                        );
                    } else {
                        msg = staticLang.toastMessage.noConnection;
                    }
                    toastService.notify(msg, ToastType.Danger, alertTimeout, !!noConnectionMsg);
                }
            })
            .catch(() => {
                this.isCloud = !environment.isLocal;
            })
            .finally(() => {
                setTimeout(() => {
                    self.nativeElement.querySelector<HTMLInputElement>('#login_password')?.focus();
                });
            });

        const showWrongCredentialsError = (): void => {
            this.flags.wrongCredentials = true;
            this.loginForm.controls.login_email.setErrors({ nx_wrong_credentials: true });
            this.loginForm.controls.login_password.setErrors({ nx_wrong_credentials: true });
        };
        this.login = processService.createProcess(
            () => {
                return system.mediaserver
                    .loginToken(this.auth.login, this.auth.password, true)
                    .toPromise();
            },
            {
                ignoreUnauthorized: true,
                errorCodes: {
                    invalidParameter: showWrongCredentialsError,
                    notAuthorized: showWrongCredentialsError,
                    accountBlocked: () => {
                        this.loginForm.controls.login_password.markAsPristine();
                        this.loginForm.controls.login_password.markAsUntouched();

                        this.flags.accountBlocked = true;
                        this.loginForm.controls.login_password.setErrors({
                            nx_account_blocked: true,
                        });
                    },
                },
            },
            () => this.close(true),
            () => {
                setTimeout(() => {
                    self.nativeElement.querySelector<HTMLInputElement>('#login_password')?.focus();
                });
            },
        );

        if (!environment.isLocal || system.mediaserver.isSessionOauth) {
            loginService.currentSystem = system;
            loginService
                .updateSession(sessionState)
                .then(ready => {
                    this.close(ready);
                })
                .catch(() => {
                    this.close(false);
                });
        }
    }
}
