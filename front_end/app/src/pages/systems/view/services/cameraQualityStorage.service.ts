import { Injectable } from '@angular/core';
import { NxAccountService } from '@services/account.service';
import { LocalStorageService } from 'ngx-webstorage';
import { PlaybackQuality } from '../view.types';

@Injectable({
    providedIn: 'root'
})
export class CameraQualityStorageService {
    user = ''
    constructor(
    private localStorageService: LocalStorageService,
    private accountService: NxAccountService
    ) {
        this.accountService.accountSubject.subscribe(({ email, id }) => {
            this.user = email || id;
        });
    }

    protected _getLocalStorageKey (user, cameraId) {
        // return `${this.user}_quality_${cameraId}`
        return `${this.user}_quality`
    }

    public get (cameraId: string) {
        const result = this.localStorageService.retrieve(
            this._getLocalStorageKey(this.user, cameraId
        )) || 'auto';
        // console.log('QUALITY GET', cameraId, result)
        return result
    }

    public set (cameraId: string, quality: PlaybackQuality) {
        // console.log('QUALITY SET', cameraId, quality)
        return this.localStorageService.store(
            this._getLocalStorageKey(this.user, cameraId
        ), quality);
    }
}

export default CameraQualityStorageService;
