import { Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { LocalStorageService } from 'ngx-webstorage';

import { NxAccountService } from '@services/account.service';

import { PlaybackTransport } from '../view.types';

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class CameraTransportStorageService {
    user = '';
    constructor(
        private localStorageService: LocalStorageService,
        private accountService: NxAccountService
    ) {
        this.accountService.accountSubject
            .pipe(untilDestroyed(this))
            .subscribe(({ email, id }) => {
                this.user = email || id;
            });
    }

    public get(cameraId: string): PlaybackTransport {
        return this.localStorageService.retrieve(
            `${this.user}_transport_${cameraId}`
        );
    }

    public set(cameraId: string, transport: PlaybackTransport): void {
        if (transport) {
            this.localStorageService.store(
                `${this.user}_transport_${cameraId}`, transport
            );
        }
    }
}
