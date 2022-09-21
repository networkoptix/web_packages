import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
} from '@angular/core';
import { NgModel } from '@angular/forms';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NgChanges } from '@utils/ng-changes';

@Component({
    selector: 'nx-password-input-validation',
    templateUrl: 'password-validation.component.html',
    styleUrls: ['password-validation.component.scss']
})
export class NxPasswordValidationComponent implements OnChanges {
    @Input() forElement: NgModel;
    @Input() value: string;
    @Input() customClass: string;
    @Input() hideErrors: boolean = false;
    @Output() updateWeakPassword = new EventEmitter<boolean>();

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    fairPassword: boolean;
    passwordToggle: boolean;

    weak: boolean;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnChanges(changes: NgChanges<NxPasswordValidationComponent>): void {
        if (changes.value) {
            this.weak = (
                this.forElement.errors &&
                this.forElement.errors.minlength &&
                !this.forElement.errors.pattern
            );
            this.updateWeakPassword.emit(this.weak);
        }
    }
}
