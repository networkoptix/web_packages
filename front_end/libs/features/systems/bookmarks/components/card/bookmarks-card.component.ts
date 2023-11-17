import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { icons } from '@static-variables';
import { msToParts } from '@utils/general';

import { Bookmark } from '../../bookmarks.types';

@Component({
    selector: 'nx-bookmarks-card',
    templateUrl: 'bookmarks-card.component.html',
    styleUrls: ['bookmarks-card.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxBookmarksCardComponent implements OnInit {
    @Input() bookmark: Bookmark;
    DATE_FORMAT = 'mmm dd, yyyy';
    icons = icons;

    startTime: string;
    startDate: string;
    duration: string;
    enableTooltip: boolean;
    thumbnailError: boolean;

    constructor(private dialogs: NxDialogsService, private language: NxLanguageProviderService) {}

    ngOnInit(): void {
        const currentLocale = this.language.currentLocale;
        const startDate = new Date(this.bookmark.startTimeMs + this.bookmark.timeZoneOffset);
        const timeFormat = Intl.DateTimeFormat(currentLocale, {
            hour: 'numeric',
            minute: 'numeric',
            numberingSystem: 'latn',
        });
        this.startTime = timeFormat.format(startDate);
        this.startDate = startDate.toLocaleString(currentLocale, { dateStyle: 'medium' });

        const { s: seconds, min: minutes, hr: hours } = msToParts(this.bookmark.durationMs);
        const includeHours = hours !== 0 ? hours.toString().padStart(2, '0') + ':' : '';
        this.duration = `${includeHours}${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}`;
    }

    openBookmarkModal(): void {
        this.dialogs.bookmarkDetails(this);
    }
}
