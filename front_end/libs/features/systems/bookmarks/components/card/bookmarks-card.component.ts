import { Component, Inject, Input, LOCALE_ID } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { icons } from '@lib/variables/static-variables';

import { Bookmark } from '../../bookmarks.types';

@Component({
    selector: 'nx-bookmarks-card',
    templateUrl: 'bookmarks-card.component.html',
    styleUrls: ['bookmarks-card.component.scss'],
})
export class NxBookmarksCardComponent {
    @Input() bookmark: Bookmark;
    DATE_FORMAT = 'mmm dd, yyyy';
    icons = icons;
    workingThumbnail = true;

    constructor(
        @Inject(LOCALE_ID) private locale: string,
        private dialogs: NxDialogsService,
    ) { }

    timeMsToDate(startTimeMs: number): string {
        const time = new Date(startTimeMs).toLocaleString(this.locale, { timeStyle: 'short' });
        const date = new Date(startTimeMs).toLocaleString(this.locale, { dateStyle: 'medium' });
        return `${date} • ${time}`;
    }

    durationMsToTime(durationMs: number): string {
        const seconds = Math.floor((durationMs / 1000) % 60);
        const minutes = Math.floor((durationMs / (1000 * 60)) % 60);
        const hours = Math.floor((durationMs / (1000 * 60 * 60)) % 24);
        const includeHours = hours !== 0 ? hours.toString().padStart(2, '0') + ':' : '';

        return `${includeHours}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    openBookmarkModal(): void {
        this.dialogs.bookmarkDetails(this.bookmark);
    }
}
