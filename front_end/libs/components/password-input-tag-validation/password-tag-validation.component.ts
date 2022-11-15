import {
    Component,
    Input,
    ViewEncapsulation
} from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

@Component({
    selector: 'nx-password-input-tag-validation',
    templateUrl: 'password-tag-validation.component.html',
    styleUrls: ['password-tag-validation.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxPasswordTagValidationComponent {
    @Input() forElement;

    CONFIG: IConfig;
    LANG = staticLang;

    fairPassword: boolean;
    passwordToggle: boolean;

    weak: boolean;

    constructor(
        configService: NxConfigService,
    ) {
        this.CONFIG = configService.getConfig();
    }
}
