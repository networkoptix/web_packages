import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
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
import { PipesModule } from '@pipes/pipes.module';
import { nxConfig } from '@services/nx-config/config';
import { type BookmarkV4 } from '@services/system-api.types/devices.types';
import { NxSystemService } from '@services/system.service/system.service';
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
        PipesModule,
    ],
})
export class NxBookmarksCardModalComponent {
    icons = icons;
    BookmarkV4: BookmarkV4;

    exportName: string;
    bookmark: Bookmark;
    time: string;
    date: string;
    fullRecordingUrl: string;
    videoError$$ = signal(false);
    videoLoaded$$ = signal(false);
    bookmarkSharingEnabled = false;

    constructor(
        public dialogRef: DialogRef<DT['return']>,
        private dialogs: NxDialogsService,
        systemService: NxSystemService,
        @Inject(DIALOG_DATA) { bookmark, startTime, startDate }: DT['data'],
    ) {
        this.bookmark = bookmark;
        this.exportName = `${bookmark.deviceId}.mkv`; // Will switch to mp4 in the future
        this.time = startTime;
        this.date = startDate;
        this.fullRecordingUrl = `systems/${bookmark.systemId}/view/${bookmark.deviceId}?time=${bookmark.startTimeMs}`;
        this.bookmarkSharingEnabled =
            !!nxConfig.featureFlags.bookmarkSharing &&
            systemService.getCurrentSystem().version >= 6.1;
    }

    openDownloadDialog(): void {
        const dialogData = {
            bookmarkName: this.bookmark.name,
            exportName: this.exportName,
            downloadSrc: this.bookmark.downloadSrc,
        };
        this.dialogs.bookmarkDownload(dialogData);
    }

    openShareDialog(): void {
        this.dialogs.bookmarkShare(this.bookmark);
    }

    close(): void {
        this.dialogRef.close();
    }
}
