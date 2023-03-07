import { Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { LocalStorageService } from 'ngx-webstorage';

import { accountSelectors } from '@common/store/account';

import { PlaybackQuality } from '../view.types';

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class CameraQualityStorageService {
    user = '';
    constructor(private localStorageService: LocalStorageService, private store: Store) {
        this.store.select(accountSelectors.selectCurrentUser)
            .pipe(untilDestroyed(this))
            .subscribe(({ email, id }) => {
                this.user = email || id;
            });
    }

    public get(cameraId: string): string {
        return this.localStorageService.retrieve(
            `${this.user}_quality_${cameraId}`
        ) || '';
    }

    public set(cameraId: string, quality: PlaybackQuality): void {
        this.localStorageService.store(
            `${this.user}_quality_${cameraId}`,
            quality
        );
    }
}
