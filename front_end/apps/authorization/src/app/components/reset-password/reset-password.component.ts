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
    selector: 'nx-authorize-reset-password-component',
    templateUrl: 'reset-password.component.html',
    styleUrls: ['reset-password.component.scss']
})
export class NxAuthorizeResetPasswordComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

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

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

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
