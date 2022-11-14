import { Component, OnInit } from '@angular/core';

import type { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Component({
    selector: 'nx-bookmarks-component',
    templateUrl: 'bookmarks.component.html',
    styleUrls: ['bookmarks.component.scss']
})

export class NxBookmarksComponent implements OnInit {
    LANG: LanguageI18NStaticTypes;

    constructor(
        language: NxLanguageProviderService,
    ) {
        this.LANG = language.translations;
    }

    ngOnInit(): void {}
}
