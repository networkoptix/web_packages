import { Component, Input } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LanguageI18NStaticTypes } from '../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector    : 'nx-additional-systems-tile',
    templateUrl : 'additional-systems-tile.component.html',
    styleUrls   : ['additional-systems-tile.component.scss']
})
export class NxAdditionalSystemsTileComponent {
    @Input() additionalSystems$: BehaviorSubject<number>;
    @Input() width = 240;

    LANG: LanguageI18NStaticTypes;
    systems = ''
    constructor(language: NxLanguageProviderService) {
        this.LANG = language.translations;
    }

    ngOnChanges() {
        this.systems = this.LANG.additionalSystems({ count: this.additionalSystems$.value });
    }
};
