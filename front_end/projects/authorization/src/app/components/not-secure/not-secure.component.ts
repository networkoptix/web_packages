import {
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { AuthorizeStateType } from '../authorize.component';

@Component({
    selector: 'nx-authorize-not-secure-component',
    templateUrl: 'not-secure.component.html',
    styleUrls: ['not-secure.component.scss']
})

export class NxAuthorizeNotSecureComponent {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    readonly environment = environment;

    @Input() viewType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() redirectUrl: string;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        const lang = language.translations;
        this.LANG = lang;
        this.CONFIG = configService.getConfig();
    }
}
