import { CommonModule } from '@angular/common';
import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    OnChanges,
} from '@angular/core';
// import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { PasswordValidationModule } from '@components/password-input-validation/password-validation.module';
import { PasswordModule } from '@components/password-input/password.module';
import { ProcessButtonModule } from '@components/process-button/process-button.module';
import { icons } from '@lib/variables/static-variables';
import { Process } from '@services/process.service/process';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-reset-password-component',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslateModule, AngularSvgIconModule, PasswordModule, PasswordValidationModule, ProcessButtonModule],
    templateUrl: 'reset-password.component.html',
    styleUrls: ['reset-password.component.scss'],
})
export class NxAuthorizeResetPasswordComponent implements OnInit, OnChanges, OnDestroy {
    icons = icons;

    @Input() viewType: string;
    @Input() loginEmail: string;
    @Input() password: string;
    @Input() confirm: boolean;
    @Input() newPasswordProcess: Process;
    @Input() loginProcess: Process;
    @Output() passwordChange = new EventEmitter<string>();
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();
    // @Input() errorCode: string;
    weakPassword: boolean = null;
    sendPassword: () => void;
    // @ViewChild('resetForm', { static: false }) resetForm: NgForm;

    ngOnInit(): void {
        this.sendPassword = () => {
            this.passwordChange.emit(this.password);
        };
    }

    ngOnChanges(changes: NgChanges<NxAuthorizeResetPasswordComponent>): void {
        // if (changes.errorCode) {
        //     this.resetForm?.controls.password.setErrors({ [changes.errorCode.currentValue]: true });
        // }
    }

    ngOnDestroy(): void { }
}
