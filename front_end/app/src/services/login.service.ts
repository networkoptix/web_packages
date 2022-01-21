import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LocalStorageService } from 'ngx-webstorage';
import { Subject } from 'rxjs';
import { switchMap, take, takeUntil } from 'rxjs/operators';

import {
    LoginWebadminModalContent
} from '@dialogs/login-webadmin/login-webadmin.component';
import { environment } from '@environments/environment';
import type { NxAccountService } from '@services/account.service';

import { NxBootstrapProvider } from './nx-bootstrap-provider';
import { IConfig, NxConfigService } from './nx-config';
import { IParams, NxSystem } from './system.service';

@Injectable({
    providedIn: 'root'
})
export class NxLoginService {
    CONFIG: IConfig;

    closeResult: string;
    done$: Subject<boolean> = new Subject<boolean>();

    private _accountService: NxAccountService;
    private _currentSystem: NxSystem;

    constructor(
        configService: NxConfigService,
        private http: HttpClient,
        private location: Location,
        private modalService: NgbModal,
        private router: Router,
        private storage: LocalStorageService,
        private bootstrapProvider: NxBootstrapProvider
    ) {
        this.CONFIG = configService.getConfig();
    }

    set accountService(accountService) {
        this._accountService = accountService;
    }

    set currentSystem(system) {
        this._currentSystem = system;
    }

    private createModal<Modal, Options extends IParams, Inputs extends IParams, Result extends any> (
        modal: Modal, options: Options, inputs: Inputs
    ): Promise<Result> {
        const modalRef = this.modalService.open(modal, options);
        Object.assign(modalRef.componentInstance, inputs);
        return modalRef.result;
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

    login (
        keepPage?: boolean,
        redirectClose?: boolean,
        redirectHome = false,
        blockNavigation = false
    ) {
        if (this.CONFIG.browserNotSupported) {
            return;
        }

        const options: IParams = {
            windowClass: 'modal-holder',
            backdrop: 'static',
            size: 'sm'
        };

        const system = this._currentSystem || { mediaserver: this._accountService.mediaServerApi };
        const params: IParams = {
            account: this._accountService,
            login: system.mediaserver.loginToken,
            cancellable: !keepPage || false,
            closable: true,
            location: this.location,
            keepPage: (keepPage !== undefined) ? keepPage : true,
            redirectClose: redirectClose || false,
            redirectHome,
            blockNavigation
        };

        if (environment.isLocal) {
            if (this.bootstrapProvider.newSystem) {
                return;
            }
            Object.assign(options, {
                centered: true,
                keyboard: false,
                backdropClass: 'webadmin-backdrop',
                windowClass: 'webadmin-window no-scroll',
            });
        }

        return this.createModal(LoginWebadminModalContent, options, params)
            // handle how the dialog was closed
            // required if we need to have dismissible dialog otherwise
            // will raise a JS error ( Uncaught [in promise] )
            .then((result) => {
                this.closeResult = `Closed with: ${result}`;

                if (redirectClose && result === 'canceled') {
                    return this.router.navigate([this.CONFIG.redirect.unauthorised]);
                }
                return result;
            }, (reason) => {
                this.closeResult = 'Dismissed';
                return reason;
            });
    }

    cancelCodeSubscription() {
        this.done$.next(true);
    }

    async updateSession(state?: string) {
        if (this._currentSystem.useRest && this._currentSystem.mediaserver.isSessionOauth) {
            const authorizeUrl = `${environment.isLocal ? '/#' : ''}/cloud-authorize${state ? '?state=' + state : ''}`;
            window.open(authorizeUrl, '_blank').focus();
            return this.storage.observe(this.CONFIG.oauthStore.code)
                .pipe(
                    takeUntil(this.done$),
                    take(1),
                    switchMap((code) => this.handleCode(code))).toPromise();
        }
        return Promise.resolve(false);
    }
}
