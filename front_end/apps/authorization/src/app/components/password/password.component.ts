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
import type { NgForm } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process } from '@services/process.service/process';
import { NgChanges } from '@utils/ng-changes';

import type { AuthorizeStateType } from '../authorize.component.types';
import { setupText, TemplateText } from '../setupText';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-password-component',
    templateUrl: 'password.component.html',
    styleUrls: ['password.component.scss']
})
export class NxAuthorizePasswordComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    readonly environment = environment;
    LANG: LanguageI18NStaticTypes;

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

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.templateText = setupText(this.LANG);
        this.setText();
        this.sendPassword = () => {
            this.loginPasswordChange.emit(this.loginPassword);
        };
    }

    ngOnChanges(changes: NgChanges<NxAuthorizePasswordComponent>): void {
        if (changes.errorCode?.currentValue) {
            this.passwordForm?.controls.password.setErrors({ [changes.errorCode.currentValue]: true });
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
        if (this.clientType.includes('Password')) {
            this.subHeaderSuffix = this.templateText[this.clientType]?.subHeaderSuffix;
        }
    }

    ngOnDestroy(): void { }
}
