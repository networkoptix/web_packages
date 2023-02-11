import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, LOCALE_ID, Inject } from '@angular/core';

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
    time: string;
    date: string;

    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(LOCALE_ID) private locale: string,
        @Inject(DIALOG_DATA) public bookmark: DT['data'],
    ) { }

    ngOnInit(): void {
        this.exportName = `${this.bookmark.deviceId}.mp4`;
        this.time = new Date(this.bookmark.startTimeMs).toLocaleString(this.locale, { timeStyle: 'short' });
        this.date = new Date(this.bookmark.startTimeMs).toLocaleString(this.locale, { dateStyle: 'medium' });
    }

    close(): void {
        this.dialogRef.close();
    }
}
