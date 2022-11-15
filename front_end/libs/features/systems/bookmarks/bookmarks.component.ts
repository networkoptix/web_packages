import { Component, OnInit } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';

@Component({
    selector: 'nx-bookmarks-component',
    templateUrl: 'bookmarks.component.html',
    styleUrls: ['bookmarks.component.scss']
})

export class NxBookmarksComponent implements OnInit {
    LANG = staticLang;

    ngOnInit(): void {}
}
