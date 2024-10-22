import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { Observable } from 'rxjs';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { icons } from '@static-variables';

import { BookmarkDownload as DT } from '../../dialogs.types';

@Component({
    selector: 'nx-bookmark-download',
    templateUrl: 'bookmark-download.component.html',
    styleUrls: ['bookmark-download.component.scss'],
    standalone: true,
    imports: [
        AngularSvgIconModule,
        CommonModule,
        TranslateModule,
        NxAddSvgSrcDirective,
        PipesModule,
    ],
})
export class NxBookmarkDownloadComponent {
    LANG = staticLang;
    icons = icons;
    bookmarkName: string;
    exportName: string;
    downloadSrc$: Observable<string>;

    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { bookmarkName, exportName, downloadSrc }: DT['data'],
    ) {
        this.bookmarkName = bookmarkName;
        this.exportName = exportName;
        this.downloadSrc$ = downloadSrc;
    }

    close(): void {
        this.dialogRef.close();
    }
}
