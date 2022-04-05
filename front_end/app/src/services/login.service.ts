import { ComponentType, Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';
import { Subject } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DialogConfig } from '@dialogs/dialog-config';
import { defaultConfig, DIALOG_DATA, DIALOG_SIZE, DialogRef } from '@dialogs/dialog-ref';
import {
    LoginWebadminModalContent
} from '@dialogs/login-webadmin/login-webadmin.component';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import { environment } from '@environments/environment';
import type { NxAccountService } from '@services/account.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxBootstrapProvider } from './nx-bootstrap-provider';
import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import type{ NxSystem } from './system.service/system';

@Injectable({
    providedIn: 'root'
})
export class NxLoginService {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    closeResult: string;
    done$: Subject<boolean> = new Subject<boolean>();

    private _accountService: NxAccountService;
    private _currentSystem: NxSystem;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private http: HttpClient,
        private location: Location,
        private router: Router,
        private storage: LocalStorageService,
        private simpleDialogService: NxSimpleDialogsService,
        private bootstrapProvider: NxBootstrapProvider,
        private overlay: Overlay,
        private injector: Injector,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    set accountService(accountService) {
        this._accountService = accountService;
    }

    set currentSystem(system) {
        this._currentSystem = system;
    }

    private open<T>(component: ComponentType<T>, config: DialogConfig = defaultConfig): DialogRef {
        const positionStrategy = this.overlay
            .position()
            .global()
            .centerHorizontally()
            .centerVertically();

        const overlayRef = this.overlay.create({
            positionStrategy,
            hasBackdrop: config.hasBackdrop,
            backdropClass: config.backdropClass,
            panelClass: config.panelClass,
            width: config.width,
        });

        // Create dialogRef to return
        const dialogRef = new DialogRef(overlayRef);
        const injector = Injector.create({
            parent: this.injector,
            providers: [
                { provide: DialogRef, useValue: dialogRef },
                { provide: DIALOG_DATA, useValue: config.data },
            ]
        });

        const portal = new ComponentPortal(component, null, injector);
        overlayRef.attach(portal);

        return dialogRef;
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
        return sessionRenewal.then(() => Promise.resolve(true))
            .catch(() => Promise.resolve(false));
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
    ) {
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
                return;
            }
            Object.assign(config, {
                keyboard: false,
                backdropClass: 'webadmin-backdrop-login',
                panelClass: 'webadmin-window' //  only one class is allowed
            });
        }

        const dialogConfig: DialogConfig = Object.assign({}, defaultConfig, config);

        return this.open(LoginWebadminModalContent, dialogConfig)
            .afterClosed().then(result => {
                this.closeResult = `Closed with: ${result}`;

                if (redirectClose && result === 'canceled') {
                    return this.router.navigate([this.CONFIG.redirect.unauthorised]);
                }
                return result;
            }, reason => {
                this.closeResult = 'Dismissed';
                return reason;
            });

        // return this.createModal(LoginWebadminModalContent, options, params)
        //     // handle how the dialog was closed
        //     // required if we need to have dismissible dialog otherwise
        //     // will raise a JS error ( Uncaught [in promise] )
        //     .then((result) => {
        //         this.closeResult = `Closed with: ${result}`;
        //
        //         if (redirectClose && result === 'canceled') {
        //             return this.router.navigate([this.CONFIG.redirect.unauthorised]);
        //         }
        //         return result;
        //     }, (reason) => {
        //         this.closeResult = 'Dismissed';
        //         return reason;
        //     });
    }

    cancelCodeSubscription() {
        this.done$.next(true);
    }

    async updateSession(state?: string) {
        if (this._currentSystem.useRest && this._currentSystem.mediaserver.isSessionOauth) {
            if (!(await this.pingCloud())) {
                this.simpleDialogService.notify(this.LANG.toastMessage.noInternet(), 'warning', true);
                return Promise.resolve(false);
            }
            const authorizeUrl = `${environment.isLocal ? '/#' : ''}/cloud-authorize${state ? '?state=' + state : ''}`;
            window.open(authorizeUrl, '_blank').focus();
            return this.storage.observe(this.CONFIG.oauthStore.code)
                .pipe(
                    takeUntil(this.done$),
                    take(1),
                    switchMap(code => this.handleCode(code))).toPromise();
        }
        return Promise.resolve(false);
    }
}
