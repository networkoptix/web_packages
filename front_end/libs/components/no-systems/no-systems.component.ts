import {
    Component, OnInit, ViewEncapsulation
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';

@Component({
    selector: 'nx-no-systems',
    templateUrl: 'no-systems.component.html',
    styleUrls: ['no-systems.component.scss'],
    encapsulation: ViewEncapsulation.None
})

export class NxNoSystemsComponent implements OnInit {
    LANG: LanguageI18NStaticTypes;

    private setupDefaults(): void {
        this.pageService.pageTitle = this.LANG.pageTitles.systems;
    }

    constructor(
        languageService: NxLanguageProviderService,
        private pageService: NxPageService
    ) {
        this.LANG = languageService.translations;
        this.setupDefaults();
    }

    ngOnInit(): void {
    }
}
