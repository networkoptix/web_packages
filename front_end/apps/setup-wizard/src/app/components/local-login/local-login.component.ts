import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { WizardStateService } from '../../services/wizard-state.service';
import { FORM_STATE } from '../../types/wizard-state.types';

@UntilDestroy()
@Component({
    selector: 'nx-local-login',
    templateUrl: './local-login.component.html',
    styleUrls: ['./local-login.component.scss']
})
export class LocalLoginComponent implements AfterViewInit {
    @ViewChild('setAdminPasswordForm', { static: false }) setAdminPasswordForm: NgForm;

    CONFIG: IConfig;
    passwordToggle: boolean = true;

    get password(): string {
        return this.wizardService.setupConfig.localPassword;
    }
    set password(password: string) {
        this.wizardService.setupConfig.localPassword = password;
    }

    get confirmedPassword(): string {
        return this.wizardService.setupConfig.localPasswordConfirmation;
    }

    set confirmedPassword(password: string) {
        this.wizardService.setupConfig.localPasswordConfirmation = password;
    }

    constructor(
        configService: NxConfigService,
        public wizardService: WizardStateService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    ngAfterViewInit(): void {
        this.wizardService.setupConfig.localLoginDataState = FORM_STATE.INVALID;
        this.setAdminPasswordForm.valueChanges
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                if (!this.setAdminPasswordForm.form.controls.createPassword.value ||
                    this.setAdminPasswordForm.form.controls.createPassword.value.length > this.CONFIG.credentialsValidation.passwordRequirements.maxLength ||
                    this.setAdminPasswordForm.form.controls.createPassword.value !== this.setAdminPasswordForm.form.controls.confirmPassword.value
                ) {
                    this.wizardService.setupConfig.localLoginDataState = FORM_STATE.INVALID;
                } else {
                    this.wizardService.setupConfig.localLoginDataState = FORM_STATE.VALID;
                }
            });

        this.wizardService.formValidateSubject
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                for (const ctrl in this.setAdminPasswordForm.controls) {
                // eslint-disable-next-line no-prototype-builtins
                    if (this.setAdminPasswordForm.controls.hasOwnProperty(ctrl)) {
                        this.setAdminPasswordForm.form.get(ctrl).markAsTouched();
                        this.setAdminPasswordForm.form.get(ctrl).markAsDirty();
                    }
                }
                this.checkPasswords();
            });
    }

    checkPasswords(): void {
        if (this.confirmedPassword !== this.password) {
            this.setAdminPasswordForm.controls.confirmPassword.setErrors({ dontMatch: true });
        }
    }
}
