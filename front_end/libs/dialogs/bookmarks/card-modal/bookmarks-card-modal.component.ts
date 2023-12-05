import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { ClipComponent } from '@components/clip/clip.component';
import { NxPlayerPlaceholderComponent } from '@components/placeholders/player/player-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { BookmarkDetails as DT } from '@dialogs/dialogs.types';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import type { Bookmark } from '@pages/systems/bookmarks/bookmarks.types';
import { cleanId } from '@utils/general';
import { icons } from '@variables/static-variables';

@Component({
    selector: 'nx-bookmarks-card-modal',
    templateUrl: 'bookmarks-card-modal.component.html',
    styleUrls: ['bookmarks-card-modal.component.scss'],
    standalone: true,
    imports: [
        AngularSvgIconModule,
        CommonModule,
        ClipComponent,
        NxProcessButtonComponent,
        TranslateModule,
        NxPlayerPlaceholderComponent,
        NxAddSvgSrcDirective,
        NxPreLoaderComponent,
    ],
})
export class NxBookmarksCardModalComponent {
    icons = icons;
    exportName: string;
    bookmark: Bookmark;
    time: string;
    date: string;
    fullRecordingUrl: string;
    videoError$$ = signal(false);
    videoLoaded$$ = signal(false);

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
