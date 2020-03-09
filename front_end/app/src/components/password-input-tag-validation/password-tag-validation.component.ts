import {
    Component, forwardRef, Input,
    OnChanges, SimpleChanges, ViewEncapsulation
} from '@angular/core';
import { NxConfigService }           from '../../services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { IConfig } from '../../services/nx-config/config-types';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';

@Component({
    selector   : 'nx-password-input-tag-validation',
    templateUrl: 'password-tag-validation.component.html',
    styleUrls  : ['password-tag-validation.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxPasswordTagValidationComponent implements OnChanges {

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
            this.forElement.weak = false;
            if (this.forElement.errors && !this.forElement.errors.pattern) {
                const {weak, common, minlength, required} = this.forElement.errors;
                this.weak = (weak && !common && !minlength) || (common && !minlength && !required) || minlength;
            }
        }
    }
}
