import { Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { LocalStorageService } from 'ngx-webstorage';

import { accountSelectors } from '@common/store/account';

import { PlaybackTransport } from '../view.types';

@UntilDestroy()
@Injectable({
    providedIn: 'root',
})
export class CameraTransportStorageService {
    user = '';
    constructor(private localStorageService: LocalStorageService, private store: Store) {
        this.store
            .select(accountSelectors.selectCurrentUser)
            .pipe(untilDestroyed(this))
            .subscribe(({ email, id }) => {
                this.user = email || id;
            });
    }

    public get(cameraId: string): PlaybackTransport {
        return this.localStorageService.retrieve(`${this.user}_transport_${cameraId}`);
    }

    public set(cameraId: string, transport: PlaybackTransport): void {
        if (transport) {
            this.localStorageService.store(`${this.user}_transport_${cameraId}`, transport);
        }
    }
}
