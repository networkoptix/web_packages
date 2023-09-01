import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { icons } from '@static-variables';

import { BookmarkDownload as DT } from '../../dialogs.types';

@Component({
    selector: 'nx-bookmark-download',
    templateUrl: 'bookmark-download.component.html',
    styleUrls: ['bookmark-download.component.scss'],
    standalone: true,
    imports: [AngularSvgIconModule, CommonModule, TranslateModule, NxAddSvgSrcDirective],
})
export class NxBookmarkDownloadComponent {
    LANG = staticLang;
    icons = icons;
    bookmarkName: string;
    exportName: string;
    downloadSrc: string;

    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { bookmarkName, exportName, downloadSrc }: DT['data'],
    ) {
        this.bookmarkName = bookmarkName;
        this.exportName = exportName;
        this.downloadSrc = downloadSrc;
    }

    close(): void {
        this.dialogRef.close();
    }
}
