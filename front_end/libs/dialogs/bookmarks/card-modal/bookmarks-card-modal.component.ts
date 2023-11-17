import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import type { Bookmark } from '@pages/systems/bookmarks/bookmarks.types';
import { icons } from '@src/app/variables/static-variables';
import { cleanId } from '@utils/general';

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
    fullRecordingUrl: string;

    constructor(
        public dialogRef: DialogRef<DT['return']>,
        private dialogs: NxDialogsService,
        @Inject(DIALOG_DATA) { bookmark, startTime, startDate }: DT['data'],
    ) {
        this.bookmark = bookmark;
        this.exportName = `${bookmark.deviceId}.mkv`; // Will switch to mp4 in the future
        this.time = startTime;
        this.date = startDate;
        this.fullRecordingUrl = `systems/${cleanId(bookmark.systemId)}/view/${cleanId(
            bookmark.deviceId,
        )}?time=${bookmark.startTimeMs}`;
    }

    openDownloadDialog(): void {
        const dialogData = {
            bookmarkName: this.bookmark.name,
            exportName: this.exportName,
            downloadSrc: this.bookmark.downloadSrc,
        };
        this.dialogs.bookmarkDownload(dialogData);
    }

    close(): void {
        this.dialogRef.close();
    }
}
