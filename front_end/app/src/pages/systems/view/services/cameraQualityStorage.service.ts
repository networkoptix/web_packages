import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';

import { NxAccountService } from '@services/account.service';

import { PlaybackQuality } from '../view.types';

@Injectable({
    providedIn: 'root'
})
export class CameraQualityStorageService {
    user = '';
    constructor(
    private localStorageService: LocalStorageService,
    private accountService: NxAccountService
    ) {
        this.accountService.accountSubject.subscribe(({ email, id }) => {
            this.user = email || id;
        });
    }

    public get(cameraId: string) {
        return this.localStorageService.retrieve(
            `${this.user}_quality_${cameraId}`
        ) || '';
    }

    public set(cameraId: string, quality: PlaybackQuality) {
        this.localStorageService.store(
            `${this.user}_quality_${cameraId}`,
            quality
        );
    }
}
