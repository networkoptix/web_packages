import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { Observable } from 'rxjs';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import staticLang from '@language_static';
import type { Translatable } from '@pipes/nx-translate.types';
import { PipesModule } from '@pipes/pipes.module';
import { NxSystemRestAPI4 } from '@services/system-rest-api-v4.service';
import { NxSystemService } from '@services/system.service/system.service';

import { BookmarkShare as DT } from '../../dialogs.types';

import { getExpirationText } from './bookmark-sharing.util';
import { NxShareDetailsComponent } from './share-details/share-details.component';

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
        CommonModule,
        TranslateModule,
        NxPreLoaderComponent,
        NxShareDetailsComponent,
        PipesModule,
    ],
})
export class NxBookmarkShareComponent {
    mediaServer: NxSystemRestAPI4;

    shareUrl: string;
    loading = true;

    expirationText: Observable<Translatable>;
    passwordDetailsText: string;

    constructor(
        public dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private bookmark: DT['data'],
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
                .subscribe(updatedBookmark => {
                    this.loading = false;
                    // Slight anti-pattern. This updates the bookmark all the way back to the BookmarkCard.
                    // We should update this logic in the future when we have a better data layer
                    bookmark.share = updatedBookmark.share;
                    this.updateTextDetails();
                });
        } else {
            this.loading = false;
            this.updateTextDetails();
        }
    }

    updateTextDetails(): void {
        if (this.bookmark.share) {
            this.expirationText = getExpirationText(new Date(this.bookmark.share.expirationTimeMs));
            // TODO: figure out how we know password exists. Server team is working on it
            const passwordExists = false;
            this.passwordDetailsText = passwordExists
                ? this.LANG.bookmarkSharing.passwordProtected
                : this.LANG.bookmarkSharing.notPasswordProtected;
        }
    }

    onEditClick(): void {}
    onDeleteClick(): void {}

    close(): void {
        this.dialogRef.close();
    }

    LANG = staticLang;
}
