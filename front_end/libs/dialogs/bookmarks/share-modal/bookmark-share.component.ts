import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ClipboardService } from 'ngx-clipboard';

import { NxButtonComponent } from '@components/button/button.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

import { BookmarkShare as DT } from '../../dialogs.types';

@Component({
    selector: 'nx-bookmark-share',
    templateUrl: 'bookmark-share.component.html',
    styleUrls: ['bookmark-share.component.scss'],
    standalone: true,
    imports: [
        AngularSvgIconModule,
        CommonModule,
        TranslateModule,
        NxAddSvgSrcDirective,
        NxButtonComponent,
    ],
})
export class NxBookmarkShareComponent {
    icons = icons;

    shareUrl: string;

    constructor(
        private clipboardService: ClipboardService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) bookmark: DT['data'],
    ) {
        this.shareUrl = `${window.location.origin}/${bookmark.deviceId}/${bookmark.id}`;
    }

    copyToClipboard(): void {
        this.clipboardService.copy(this.shareUrl);
    }

    close(): void {
        this.dialogRef.close();
    }
}
