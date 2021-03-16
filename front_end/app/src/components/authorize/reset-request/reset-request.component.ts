import {
    Component, EventEmitter, Input, OnDestroy,
    OnInit, Output, SimpleChanges, OnChanges, ViewChild
}                       from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process }                   from '@services/process.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-reset-request-component',
    templateUrl : 'reset-request.component.html',
    styleUrls   : ['reset-request.component.scss']
})
export class NxAuthorizeResetRequestComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() resetEmail: string;
    @Output() resetEmailChange = new EventEmitter<string>();
    @Input() confirm: boolean;
    @Input() loginProcess: Process;
    @Input() resetRequestProcess: Process;

    sendEmail: any;
    @ViewChild('resetPasswordForm', { static: false }) resetPasswordForm: HTMLFormElement;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.sendEmail = () => {
            this.resetEmailChange.emit(this.resetEmail);
        };
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.errorCode) {
            this.resetPasswordForm?.controls.password.setErrors({ [changes.errorCode.currentValue]: true });
        }
    }

    ngOnDestroy(): void {}
}
