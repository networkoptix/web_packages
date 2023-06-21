import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    OnChanges,
    ViewChild,
} from '@angular/core';
import type { NgForm, NgModel } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';

import { credentialsValidation, icons } from '@lib/variables/static-variables';
import { Process } from '@services/process.service/process';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-reset-request-component',
    templateUrl: 'reset-request.component.html',
    styleUrls: ['reset-request.component.scss'],
})
export class NxAuthorizeResetRequestComponent implements OnInit, OnChanges, OnDestroy {
    icons = icons;
    credentialsValidation = credentialsValidation;

    @Input() viewType: string;
    @Input() smallView: boolean;
    @Input() resetEmail: string;
    @Output() resetEmailChange = new EventEmitter<string>();
    @Input() loginEmail: string;
    @Input() confirm: boolean;
    @Output() confirmChange = new EventEmitter<boolean>();
    @Input() errorCode: string;
    @Input() resetRequestProcess: Process;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    sendEmail: () => void;
    @ViewChild('resetPasswordForm', { static: false }) resetPasswordForm: NgForm;
    @ViewChild('email', { static: false }) resetPasswordEmail: NgModel;

    ngOnInit(): void {
        this.resetEmail = this.loginEmail;
        this.sendEmail = () => {
            if (!this.confirm) {
                this.resetEmailChange.emit(this.resetEmail);
            }
        };
    }

    ngOnChanges(changes: NgChanges<NxAuthorizeResetRequestComponent>): void {
        if (changes.errorCode?.currentValue) {
            setTimeout(() => {
                this.resetPasswordForm?.controls.resetPasswordEmail.setErrors({
                    [changes.errorCode.currentValue]: true,
                });
            });
        }
    }

    goBack(): void {
        if (this.confirm) {
            this.confirmChange.emit(false);
        } else {
            this.setCurrentState.emit('password');
        }
    }

    ngOnDestroy(): void {}
}
