import {
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { UntilDestroy } from '@ngneat/until-destroy';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

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

    ngOnDestroy(): void { }
}
