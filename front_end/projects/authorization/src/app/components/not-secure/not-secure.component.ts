import {
    Component, EventEmitter, Input, Output, SimpleChanges
} from '@angular/core';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxUtilsService }            from '@services/utils.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { AuthorizeStateType } from '../authorize.component';
import { environment } from '@environments/environment';

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

    ngOnChanges(changes: SimpleChanges) {
        if (changes.redirectUrl?.currentValue) {
            this.redirectUrl = NxUtilsService.htmlToEntity(this.redirectUrl);
        }
    }
}
