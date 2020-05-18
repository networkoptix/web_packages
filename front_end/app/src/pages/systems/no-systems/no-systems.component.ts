import { Component, OnInit, ViewEncapsulation } from '@angular/core';

import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxPageService }             from '../../../services/page.service';
import { LanguageI18NStaticTypes } from '../../../../language_i18n_static_types';

@Component({
    selector   : 'nx-no-systems',
    templateUrl: 'no-systems.component.html',
    styleUrls  : ['no-systems.component.scss'],
    encapsulation: ViewEncapsulation.None
})

export class NxNoSystemsComponent implements OnInit {
    LANG: LanguageI18NStaticTypes;

    private setupDefaults() {
        this.LANG = this.language.translations;

        this.pageService.pageTitle = this.LANG.pageTitles.systems;
    }

    constructor(private language: NxLanguageProviderService,
                private pageService: NxPageService
    ) {
        this.setupDefaults();
    }

    ngOnInit(): void {
    }
}

