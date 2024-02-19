import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ClipboardService } from 'ngx-clipboard';

import { NxButtonComponent } from '@components/button/button.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxSystemRestAPI4 } from '@services/system-rest-api-v4.service';
import { NxSystemService } from '@services/system.service/system.service';
import { icons } from '@static-variables';

import { BookmarkShare as DT } from '../../dialogs.types';

const DEFAULT_SHARE_PARAMS = {
    expirationTimeMs: 0,
    password: '',
};

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
        NxPreLoaderComponent,
    ],
})
export class NxBookmarkShareComponent {
    icons = icons;
    mediaServer: NxSystemRestAPI4;

    shareUrl: string;
    loading = true;

    constructor(
        private clipboardService: ClipboardService,
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) bookmark: DT['data'],
        private systemService: NxSystemService,
    ) {
        this.mediaServer = this.systemService.getCurrentSystem().mediaserver as NxSystemRestAPI4;
        this.shareUrl = `${window.location.origin}/${bookmark.deviceId}/${bookmark.id}`;

        // When the user clicks Share and opens this dialog we want to share the bookmark if it's not already shared
        if (!bookmark.share) {
            this.mediaServer
                .updateBookmarkShare({
                    bookmarkId: bookmark.id,
                    deviceId: bookmark.deviceId,
                    updateBookmarkShareParams: DEFAULT_SHARE_PARAMS,
                })
                .subscribe(() => {
                    this.loading = false;
                });
        } else {
            this.loading = false;
        }
    }

    copyToClipboard(): void {
        this.clipboardService.copy(this.shareUrl);
    }

    close(): void {
        this.dialogRef.close();
    }
}
