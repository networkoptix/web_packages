import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import type { Bookmark } from '@pages/systems/bookmarks/bookmarks.types';
import { icons } from '@src/app/variables/static-variables';

import { BookmarkDetails as DT } from '../../dialogs.types';

@Component({
    selector: 'nx-bookmarks-card-modal',
    templateUrl: 'bookmarks-card-modal.component.html',
    styleUrls: ['bookmarks-card-modal.component.scss'],
})
export class NxBookmarksCardModalComponent {
    icons = icons;
    exportName: string;
    bookmark: Bookmark;
    time: string;
    date: string;
    videoError: boolean;

    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { bookmark, startTime, startDate }: DT['data'],
    ) {
        this.bookmark = bookmark;
        this.exportName = `${bookmark.deviceId}.mp4`;
        this.time = startTime;
        this.date = startDate;
    }

    close(): void {
        this.dialogRef.close();
    }
}
