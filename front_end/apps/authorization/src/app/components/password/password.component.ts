import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';

import { environment } from '@environments/environment';
import { Process } from '@services/process.service/process';
import { icons } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';
import { setupText, TemplateText } from '../setupText';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-password-component',
    templateUrl: 'password.component.html',
    styleUrls: ['password.component.scss'],
})
export class NxAuthorizePasswordComponent implements OnInit, OnChanges, OnDestroy {
    readonly environment = environment;
    icons = icons;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() emailLocked: boolean;
    @Input() loginPassword: string;
    @Output() loginPasswordChange = new EventEmitter<string>();
    @Input() passwordProcess: Process;
    @Input() errorCode: string;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    sendPassword: () => void;
    @ViewChild('passwordForm', { static: false }) passwordForm: NgForm;
    passwordToggle = true;
    header: string;
    subHeader: string | undefined;
    subHeaderSuffix: string | undefined;
    templateText: TemplateText;

    ngOnInit(): void {
        this.templateText = setupText();
        this.setText();
        this.sendPassword = () => {
            this.loginPasswordChange.emit(this.loginPassword);
        };
    }

    ngOnChanges(changes: NgChanges<NxAuthorizePasswordComponent>): void {
        if (changes.errorCode?.currentValue) {
            this.passwordForm?.controls.password.setErrors({
                [changes.errorCode.currentValue]: true,
            });
        }

        if (!changes.clientType?.firstChange) {
            this.setText();
        }
    }

    logout(): void {
        // clear out local storage of email/user information
    }

    setText(): void {
        this.header = this.templateText[this.clientType]?.header;
        this.subHeader = this.templateText[this.clientType]?.subHeader;
        this.subHeaderSuffix = this.templateText[this.clientType]?.subHeaderSuffix;
    }

    ngOnDestroy(): void {}
}
