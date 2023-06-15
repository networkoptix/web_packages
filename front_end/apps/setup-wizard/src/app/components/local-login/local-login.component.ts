import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { icons } from '@app/variables/static-variables';
import { PasswordModule } from '@components/password-input/password.module';
import { PasswordValidationModule } from '@components/password-input-validation/password-validation.module';

import { WizardStateService } from '../../services/wizard-state.service';

@UntilDestroy()
@Component({
    selector: 'nx-local-login',
    standalone: true,
    imports: [CommonModule, AngularSvgIconModule, FormsModule, TranslateModule, PasswordModule, PasswordValidationModule],
    templateUrl: './local-login.component.html',
    styleUrls: ['./local-login.component.scss'],
})
export class LocalLoginComponent implements AfterViewInit {
    icons = icons;
    @ViewChild('setAdminPasswordForm', { static: false }) setAdminPasswordForm: NgForm;

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

    constructor(public wizardService: WizardStateService) { }

    ngAfterViewInit(): void {
        this.setAdminPasswordForm.statusChanges
            .pipe(untilDestroyed(this))
            .subscribe((result: string) => {
                this.wizardService.setupConfig.localLoginDataState = result;
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
            });
    }

    checkPasswords(): void {
        if (this.confirmedPassword !== this.password) {
            this.setAdminPasswordForm.controls.confirmPassword.setErrors({ dontMatch: true });
        }
    }

    @HostListener('document:keypress', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            if (this.setAdminPasswordForm.form.valid) {
                this.wizardService.next();
            }
        }
    }
}
