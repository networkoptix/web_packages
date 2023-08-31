import { Dialog } from '@angular/cdk/dialog';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { Subject } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';

import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import staticLang from '@language_static';

import { oauthStore } from '../variables/static-variables';

import { NxBootstrapProvider } from './nx-bootstrap-provider';
import { nxConfig } from './nx-config/config';
import type { IConfig } from './nx-config/config-types';
import type { NxSystem } from './system.service/system';
import { NxToastService } from './toast.service';
import { windowFactory } from './window-provider';

@Injectable({
    providedIn: 'root',
})
export class NxLoginService {
    CONFIG: IConfig = nxConfig;
    private window: Window = windowFactory();
    LANG = staticLang;

    done$: Subject<boolean> = new Subject<boolean>();

    private _currentSystem: NxSystem;

    constructor(
        private http: HttpClient,
        private storage: LocalStorageService,
        private dialogs: NxDialogsService,
        private toasts: NxToastService,
        private cdkDialog: Dialog,
    ) {}

    set currentSystem(system) {
        this._currentSystem = system;
    }

    private handleCode(code): Promise<boolean> {
        let sessionRenewal;

        if (!environment.isLocal) {
            sessionRenewal = this.http
                .post('/api/account/renewSession', { code })
                .toPromise()
                .then(() => this._currentSystem.updateToken(true));
        } else {
            sessionRenewal = this._currentSystem.mediaserver
                .logout()
                .then(() => this._currentSystem.mediaserver.loginOauth(code).toPromise());
        }
        return sessionRenewal.then(() => Promise.resolve(true)).catch(() => Promise.reject(false));
    }

    private pingCloud(): Promise<boolean> {
        return this.http
            .get(`${this.CONFIG.cloudHost}/api/ping`)
            .toPromise()
            .then(() => Promise.resolve(true))
            .catch(() => Promise.resolve(false));
    }

    login(keepPage: boolean = true): Promise<'newSystem' | void> {
        if (this.CONFIG.browserNotSupported) {
            return;
        }

        if (environment.isLocal && NxBootstrapProvider.isNewSystem) {
            return Promise.resolve('newSystem');
        }

        return this.dialogs.loginWebAdmin(keepPage);
    }

    cancelCodeSubscription(): void {
        this.done$.next(true);
    }

    async updateSession(state: string): Promise<boolean> {
        if (
            (['disconnect', 'transfer'].includes(state) && !environment.isLocal) ||
            (this._currentSystem.useRest && this._currentSystem.mediaserver.isSessionOauth)
        ) {
            if (!(await this.pingCloud())) {
                this.toasts.show(this.LANG.toastMessage.noInternet, ToastType.Warning);
                this.cdkDialog.closeAll();

                return Promise.resolve(false);
            }
            const authorizeUrl = `${environment.isLocal ? '/#' : ''}/cloud-authorize${
                state ? '?state=' + state : ''
            }`;
            this.window.open(authorizeUrl, '_blank').focus();
            return this.storage
                .observe(oauthStore.code)
                .pipe(
                    take(1),
                    switchMap(code => this.handleCode(code)),
                    takeUntil(this.done$),
                )
                .toPromise();
        }
        return Promise.resolve(false);
    }
}
