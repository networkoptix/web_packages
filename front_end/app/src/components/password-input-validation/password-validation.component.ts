import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Component({
    selector: 'nx-password-input-validation',
    templateUrl: 'password-validation.component.html',
    styleUrls: ['password-validation.component.scss']
})
export class NxPasswordValidationComponent implements OnChanges {
    @Input() forElement;
    @Input() value;
    @Input() customClass;
    @Input() hideErrors = false;
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

    ngOnChanges(changes: SimpleChanges): void {
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
