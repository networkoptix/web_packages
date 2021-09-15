import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { IConfig, NxConfigService } from './nx-config';
import { NxStorageService } from './storage.service';
import { WINDOW } from './window-provider';

@Injectable({
    providedIn: 'root'
})
export class OauthService {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    constructor(
        configService: NxConfigService,
        private http: HttpClient,
        private storage: NxStorageService,
        @Inject(WINDOW) protected window: Window
    ) {
        this.CONFIG = configService.getConfig();
    }

    get cloudApiAccessToken() {
        return this.storage.cloudApiAccessToken;
    }

    get cloudApiRefreshToken() {
        return this.storage.cloudApiRefreshToken;
    }

    logoutTokens() {
        const accessToken = this.cloudApiAccessToken;
        const refreshToken = this.cloudApiRefreshToken;
        return this.http.post(`${this.CONFIG.cloudHost}/oauth/logout/`, { cloudAccessToken: accessToken, refreshToken })
            .pipe(
                tap(() => {
                    this.storage.clear = 'cloudApiAccessToken';
                    this.storage.clear = 'cloudApiRefreshToken';
                })
            ).toPromise();
    }

    redirectOauth(state?: string, email?: string) {
        const { href } = this.window.location;
        const clientTypes = {
            connect : 'connect',
            login   : 'loginWebadmin'
        };
        const params = new URLSearchParams({
            client_type   : state in clientTypes ? clientTypes[state] : clientTypes.login,
            view_type     : 'web',
            redirect_url  : href,
            client_id     : 'webadmin',
            response_type : 'code',
            grant_type    : 'password',
            scope         : `${this.CONFIG.cloudHost.replace(/http?s:\/\//, '')}`,
            state         : state,
            email         : email
        });
        this.window.location.href = `${this.CONFIG.cloudHost}/authorize?${params.toString()}`;
        return false;
    }

    setTokens(tokens) {
        this.storage.cloudApiAccessToken = tokens.access_token;
        this.storage.cloudApiRefreshToken = tokens.refresh_token;
    }
}
