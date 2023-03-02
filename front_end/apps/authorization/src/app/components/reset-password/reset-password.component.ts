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
import { UntilDestroy } from '@ngneat/until-destroy';

import { icons } from '@lib/variables/static-variables';
import { Process } from '@services/process.service/process';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-reset-password-component',
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
