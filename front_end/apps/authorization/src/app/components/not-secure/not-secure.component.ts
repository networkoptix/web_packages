import {
    Component,
    EventEmitter,
    Input,
    Output
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { environment } from '@environments/environment';
import { icons } from '@lib/variables/static-variables';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import type { AuthorizeStateType } from '../authorize.component.types';

@Component({
    selector: 'nx-authorize-not-secure-component',
    templateUrl: 'not-secure.component.html',
    styleUrls: ['not-secure.component.scss']
})

export class NxAuthorizeNotSecureComponent {
    LANG: LanguageI18NStaticTypes;
    icons = icons;
    readonly environment = environment;

    @Input() viewType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() redirectUrl: string;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    constructor(
        language: NxLanguageProviderService,
    ) {
        const lang = language.translations;
        this.LANG = lang;
    }

    next(): void {
        this.setCurrentState.emit(this.loginEmail ? 'password' : 'email');
    }
}
