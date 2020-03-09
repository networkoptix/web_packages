import {
    Component, forwardRef, Input,
    OnChanges, SimpleChanges
}                                    from '@angular/core';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';

@Component({
    selector   : 'nx-password-input-validation',
    templateUrl: 'password-validation.component.html',
    styleUrls  : ['password-validation.component.scss'],
})
export class NxPasswordValidationComponent implements OnChanges {

    @Input() forElement: any;
    @Input() value: any;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    fairPassword: boolean;
    passwordToggle: boolean;

    weak: boolean;

    constructor(private configService: NxConfigService,
                private languageService: NxLanguageProviderService,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.languageService.getTranslations();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.value) {
            this.weak = (this.forElement.errors && this.forElement.errors.minlength && !this.forElement.errors.pattern); // weak
        }
    }
}
