import {
    Component,
    Input,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { icons } from '@lib/variables/static-variables';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-confirmation-component',
    templateUrl: 'confirmation.component.html',
    styleUrls: ['confirmation.component.scss']
})
export class NxAuthorizeConfirmationComponent implements OnInit, OnDestroy {
    LANG: LanguageI18NStaticTypes;
    icons = icons;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() confirm: (route?: string) => void;

    constructor(
        language: NxLanguageProviderService,
    ) {
        this.LANG = language.translations;
    }

    ngOnInit(): void {
    }

    ngOnDestroy(): void { }
}
