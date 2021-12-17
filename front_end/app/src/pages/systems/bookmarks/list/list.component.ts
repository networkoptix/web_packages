import { Component, OnDestroy, Input, Inject } from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { WINDOW } from '@services/window-provider';

import { Bookmark } from '../bookmark.service';

@Component({
    selector: 'bookmarks-list-component',
    templateUrl: 'list.component.html',
    styleUrls: ['list.component.scss']
})
export class NxBookmarksListComponent implements OnDestroy {
    @Input() list: Bookmark[];
    @Input() restError: boolean;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    gridColumnLookup: {[key: string]: string} = {};

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        @Inject(WINDOW) public window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    ngOnDestroy() {}

    updateTagSize(tagName: string, { width }: { width: number, height: number}) {
        if (this.gridColumnLookup[tagName]) return;
        const gridGap = 5;
        const columns = Math.round(width / gridGap);
        this.gridColumnLookup[tagName] = `span ${columns}`;
    }

    reloadWindow() {
        this.window.location.reload();
    }
}
