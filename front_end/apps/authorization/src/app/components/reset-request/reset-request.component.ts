import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
    OnChanges,
    ViewChild
} from '@angular/core';
import type { NgForm, NgModel } from '@angular/forms';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { UntilDestroy } from '@ngneat/until-destroy';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process } from '@services/process.service/process';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-reset-request-component',
    templateUrl: 'reset-request.component.html',
    styleUrls: ['reset-request.component.scss']
})
export class NxAuthorizeResetRequestComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() smallView: boolean;
    @Input() resetEmail: string;
    @Output() resetEmailChange = new EventEmitter<string>();
    @Input() loginEmail: string;
    @Input() confirm: boolean;
    @Input() errorCode: string;
    @Input() resetRequestProcess: Process;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    sendEmail: () => void;
    @ViewChild('resetPasswordForm', { static: false }) resetPasswordForm: NgForm;
    @ViewChild('email', { static: false }) resetPasswordEmail: NgModel;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

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
                    [changes.errorCode.currentValue]: true
                });
            });
        }
    }

    goBack(): void {
        if (this.confirm) {
            this.confirm = false;
        } else {
            this.setCurrentState.emit('password');
        }
    }

    ngOnDestroy(): void { }
}
