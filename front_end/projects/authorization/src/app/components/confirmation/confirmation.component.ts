import {
    Component, Input, OnDestroy, OnInit
}                                               from '@angular/core';
import { UntilDestroy }                         from '@ngneat/until-destroy';

import { NxConfigService, IConfig }             from '@services/nx-config';
import { NxLanguageProviderService }            from '@services/nx-language-provider';
import { LanguageI18NStaticTypes }              from '@app/language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-confirmation-component',
    templateUrl: 'confirmation.component.html',
    styleUrls: ['confirmation.component.scss']
})
export class NxAuthorizeConfirmationComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() confirm: (route?: string) => void;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
    }

    ngOnDestroy(): void {}
}
