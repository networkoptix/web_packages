import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
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

    icons = icons;

    startTime: string;
    startDate: string;
    duration: string;
    enableTooltip: boolean;
    thumbnailError: boolean;

    constructor(
        private dialogs: NxDialogsService,
        private dateTimeService: NxDateTimeFormatService,
    ) {}

    ngOnInit(): void {
        const startDatetime = new Date(this.bookmark.startTimeMs);
        this.startDate = this.dateTimeService.mediumDateString(startDatetime);
        this.startTime = startDatetime.toLocaleTimeString(this.dateTimeService.locale, {
            hour: 'numeric',
            minute: 'numeric',
            numberingSystem: 'latn',
        });

        const {
            second: seconds,
            minute: minutes,
            hour: hours,
        } = msToParts(this.bookmark.durationMs);
        const includeHours = hours !== 0 ? hours.toString().padStart(2, '0') + ':' : '';
        this.duration = `${includeHours}${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}`;
    }

    openBookmarkModal(): void {
        this.dialogs.bookmarkDetails(this);
    }
}
