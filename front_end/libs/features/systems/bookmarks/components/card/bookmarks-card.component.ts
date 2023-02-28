import { Component, Input, OnInit } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';
import { getLangCode } from '@utils/nx';

import { Bookmark } from '../../bookmarks.types';

@Component({
    selector: 'nx-bookmarks-card',
    templateUrl: 'bookmarks-card.component.html',
    styleUrls: ['bookmarks-card.component.scss'],
})
export class NxBookmarksCardComponent implements OnInit {
    @Input() bookmark: Bookmark;
    DATE_FORMAT = 'mmm dd, yyyy';
    icons = icons;
    workingThumbnail = true;

    private langLocale: string;
    startTime: string;
    startDate: string;
    duration: string;

    constructor(
        cookieService: CookieService,
        private dialogs: NxDialogsService,
    ) {
        this.langLocale = getLangCode(cookieService);
    }

    ngOnInit(): void {
        const startDate = new Date(this.bookmark.startTimeMs);
        const timeFormat = Intl.DateTimeFormat(this.langLocale, {
            hour: 'numeric',
            minute: 'numeric',
            numberingSystem: 'latn',
        });
        this.startTime = timeFormat.format(startDate);
        this.startDate = startDate.toLocaleString(this.langLocale, { dateStyle: 'medium' });

        const seconds = Math.floor((this.bookmark.durationMs / 1000) % 60);
        const minutes = Math.floor((this.bookmark.durationMs / (1000 * 60)) % 60);
        const hours = Math.floor((this.bookmark.durationMs / (1000 * 60 * 60)) % 24);
        const includeHours = hours !== 0 ? hours.toString().padStart(2, '0') + ':' : '';
        this.duration = `${includeHours}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    openBookmarkModal(): void {
        this.dialogs.bookmarkDetails(this);
    }
}
