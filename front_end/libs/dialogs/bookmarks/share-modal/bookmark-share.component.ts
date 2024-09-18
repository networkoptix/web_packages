import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { type Observable } from 'rxjs';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { ToastType } from '@components/toast-container/toast.types';
import staticLang from '@language_static';
import type { Translatable } from '@pipes/nx-translate.types';
import { PipesModule } from '@pipes/pipes.module';
import { NxSystemRestAPI4 } from '@services/system-rest-api-v4.service';
import { NxSystemService } from '@services/system.service/system.service';
import { NxToastService } from '@services/toast.service';
import { MS } from '@utils/general';

import { BookmarkShare as DT } from '../../dialogs.types';

import { getExpirationText } from './bookmark-sharing.util';
import { NxShareDetailsComponent } from './share-details/share-details.component';
import { NxShareEditComponent } from './share-edit/share-edit.component';

const DEFAULT_SHARE_PARAMS = {
    expirationTimeMs: Date.now() + MS.day,
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
        NxShareEditComponent,
        PipesModule,
    ],
})
export class NxBookmarkShareComponent {
    mediaServer: NxSystemRestAPI4;

    shareUrl: string;
    loading = signal(true);

    expirationText: Observable<Translatable>;
    passwordDetailsText: string;

    pageState = signal<'details' | 'edit'>('details');

    bookmark: DT['data'] = inject(DIALOG_DATA);
    systemService = inject(NxSystemService);
    toastService = inject(NxToastService);

    constructor(public dialogRef: DialogRef<DT['return']>) {
        const currentSystem = this.systemService.getCurrentSystem();
        this.mediaServer = currentSystem.mediaserver as NxSystemRestAPI4;
        this.shareUrl = `${window.location.origin}/share/${currentSystem.systemId}/${this.bookmark.id}`;

        // When the user clicks Share and opens this dialog we want to share the bookmark if it's not already shared
        if (!this.bookmark.share) {
            this.updateBookmarkShareData(DEFAULT_SHARE_PARAMS);
        } else {
            this.loading.set(false);
            this.updateTextDetails();
        }
    }

    updateTextDetails(): void {
        if (this.bookmark.share) {
            this.expirationText = getExpirationText(new Date(this.bookmark.share.expirationTimeMs));
            const passwordExists = this.bookmark.share.password === '******';
            this.passwordDetailsText = passwordExists
                ? this.LANG.bookmarkSharing.passwordProtected
                : this.LANG.bookmarkSharing.notPasswordProtected;
        }
    }

    onEditClick = (): void => {
        this.pageState.set('edit');
    };
    onDeleteClick(): void {
        this.loading.set(true);
        this.mediaServer
            .deleteBookmarkShare({
                bookmarkId: this.bookmark.id,
                deviceId: this.bookmark.deviceId,
            })
            .subscribe(updatedBookmark => {
                this.bookmark.share = updatedBookmark.share;
                this.close();
            });
    }
    onSaveClick(saveOptions: { password?: string; expirationTimeMs?: number }): void {
        this.updateBookmarkShareData(saveOptions);
        this.pageState.set('details');
    }

    updateBookmarkShareData(updateParams: { password?: string; expirationTimeMs?: number }): void {
        this.loading.set(true);
        this.mediaServer
            .updateBookmarkShare({
                bookmarkId: this.bookmark.id,
                deviceId: this.bookmark.deviceId,
                updateBookmarkShareParams: updateParams,
            })
            .subscribe({
                next: updatedBookmark => {
                    this.loading.set(false);
                    this.bookmark.share = updatedBookmark.share;
                    this.updateTextDetails();
                },
                error: () => {
                    this.loading.set(false);
                    this.toastService.show(
                        this.LANG.bookmarkSharing.errorUpdatingSharedBookmark,
                        ToastType.Danger,
                    );
                },
            });
    }

    onCancelEditClick(): void {
        this.pageState.set('details');
    }

    close(): void {
        this.dialogRef.close();
    }

    LANG = staticLang;
}
