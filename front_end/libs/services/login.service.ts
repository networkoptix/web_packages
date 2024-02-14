import { Dialog } from '@angular/cdk/dialog';
import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { firstValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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

@Injectable({
    providedIn: 'root',
})
export class NxLoginService {
    CONFIG: IConfig = nxConfig;
    LANG = staticLang;

    private _currentSystem: NxSystem;

    temporaryUserToken$$ = signal<string>(null);

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
            sessionRenewal = firstValueFrom(
                this.http.post('/api/account/renewSession', { code }),
            ).then(() => this._currentSystem.updateToken(true));
        } else {
            sessionRenewal = this._currentSystem.mediaserver
                .logout()
                .then(() => firstValueFrom(this._currentSystem.mediaserver.loginOauth(code)));
        }
        return sessionRenewal.then(() => Promise.resolve(true)).catch(() => Promise.reject(false));
    }

    private pingCloud(): Promise<boolean> {
        return firstValueFrom(this.http.get(`${this.CONFIG.cloudHost}/api/ping`))
            .then(() => Promise.resolve(true))
            .catch(() => Promise.resolve(false));
    }

    login(keepPage: boolean = true): Promise<'newSystem' | boolean> {
        if (this.CONFIG.browserNotSupported) {
            return Promise.resolve(false);
        }

        if (environment.isLocal && NxBootstrapProvider.isNewSystem) {
            return Promise.resolve('newSystem');
        }

        return this.dialogs.loginWebAdmin(keepPage);
    }

    temporaryUserLogin(): Promise<void> {
        return this.dialogs.temporaryUserLogin();
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

            const params = new URLSearchParams();
            if (state) {
                params.append('state', state);
            }
            if (this._currentSystem.currentUserEmail?.includes('@')) {
                params.append('email', this._currentSystem.currentUserEmail);
            }
            const queryString = params.toString();
            const authorizeUrl = `${environment.isLocal ? '/#' : ''}/cloud-authorize${
                queryString ? '?' + queryString : ''
            }`;
            window.open(authorizeUrl, '_blank')?.focus();
            return firstValueFrom(
                this.storage
                    .observe(oauthStore.code)
                    .pipe(switchMap(code => this.handleCode(code))),
            );
        }
        return Promise.resolve(false);
    }
}
