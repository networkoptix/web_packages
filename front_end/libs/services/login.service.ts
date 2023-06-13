import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { DOCUMENT, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';
import { Subject } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { LoginWebadminModalContent } from '@components/login-webadmin/login-webadmin.component';
import { DialogBase } from '@dialogs/dialog-base';
import { DialogConfig } from '@dialogs/dialog-config';
import { defaultConfig, DIALOG_SIZE } from '@dialogs/dialog-ref';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import type { NxAccountService } from '@services/account.service';

import { oauthStore, redirect } from '../variables/static-variables';

import { NxBootstrapProvider } from './nx-bootstrap-provider';
import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import type { NxSystem } from './system.service/system';
import { WINDOW } from './window-provider';

@Injectable({
    providedIn: 'root'
})
export class NxLoginService extends DialogBase {
    CONFIG: IConfig;
    LANG = staticLang;

    closeResult: string;
    done$: Subject<boolean> = new Subject<boolean>();

    private _accountService: NxAccountService;
    private _currentSystem: NxSystem;

    constructor(
        configService: NxConfigService,
        overlay: Overlay,
        injector: Injector,
        private http: HttpClient,
        private location: Location,
        private router: Router,
        private storage: LocalStorageService,
        private dialogs: NxDialogsService,
        private bootstrapProvider: NxBootstrapProvider,
        private cdkDialog: Dialog,
        @Inject(WINDOW) private window: Window,
        @Inject(DOCUMENT) document: Document,
    ) {
        super(overlay, injector, document);
        this.CONFIG = configService.getConfig();
    }

    set accountService(accountService) {
        this._accountService = accountService;
    }

    set currentSystem(system) {
        this._currentSystem = system;
    }

    private handleCode(code): Promise<boolean> {
        let sessionRenewal;

        if (!environment.isLocal) {
            sessionRenewal = this.http.post('/api/account/renewSession', { code }).toPromise()
                .then(() => this._currentSystem.updateToken(true));
        } else {
            sessionRenewal = this._currentSystem.mediaserver.logout()
                .then(() => this._currentSystem.mediaserver.loginOauth(code).toPromise());
        }
        return sessionRenewal.then(() => Promise.resolve(true)).catch(() => Promise.reject(false));
    }

    private pingCloud(): Promise<boolean> {
        return this.http.get(`${this.CONFIG.cloudHost}/api/ping`).toPromise()
            .then(() => Promise.resolve(true))
            .catch(() => Promise.resolve(false));
    }

    login(
        keepPage?: boolean,
        redirectClose?: boolean,
        redirectHome = false,
        blockNavigation = false
    ): undefined | Promise<string | boolean> {
        if (this.CONFIG.browserNotSupported) {
            return;
        }

        const system = this._currentSystem || { mediaserver: this._accountService.mediaServerApi };
        const config: Partial<DialogConfig> = {
            width: DIALOG_SIZE.SMALL,
            data: {
                account: this._accountService,
                login: system.mediaserver.loginToken,
                cancellable: !keepPage || false,
                location: this.location,
                keepPage: (keepPage !== undefined) ? keepPage : true,
                redirectClose: redirectClose || false,
                redirectHome,
                blockNavigation
            }
        };

        if (environment.isLocal) {
            if (this.bootstrapProvider.newSystem) {
                return Promise.resolve('newSystem');
            }
            Object.assign(config, {
                keyboard: false,
                backdropClass: 'webadmin-backdrop-login',
                panelClass: 'webadmin-window' //  only one class is allowed
            });
        }

        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(LoginWebadminModalContent, dialogConfig)
            .afterClosed()
            .then(result => {
                this.closeResult = `Closed with: ${result}`;

                if (redirectClose && result === 'canceled') {
                    return this.router.navigate([redirect.unauthorised]);
                }
                return result;
            }, reason => {
                this.closeResult = 'Dismissed';
                return reason;
            });
    }

    cancelCodeSubscription(): void {
        this.done$.next(true);
    }

    async updateSession(state: string): Promise<boolean> {
        if (['disconnect', 'transfer'].includes(state) && !environment.isLocal ||
        this._currentSystem.useRest && this._currentSystem.mediaserver.isSessionOauth) {
            if (!(await this.pingCloud())) {
                this.dialogs.notify(this.LANG.toastMessage.noInternet, 'warning', true);
                // Close dialog if any
                this.dismissDialog();
                this.cdkDialog.closeAll();

                return Promise.resolve(false);
            }
            const authorizeUrl = `${environment.isLocal ? '/#' : ''}/cloud-authorize${state ? '?state=' + state : ''}`;
            this.window.open(authorizeUrl, '_blank').focus();
            return this.storage.observe(oauthStore.code)
                .pipe(
                    take(1),
                    switchMap(code => this.handleCode(code)),
                    takeUntil(this.done$),
                ).toPromise();
        }
        return Promise.resolve(false);
    }
}
