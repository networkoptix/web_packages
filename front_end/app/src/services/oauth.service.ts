import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { IConfig, NxConfigService } from './nx-config';
import { NxStorageService } from './storage.service';
import { WINDOW } from './window-provider';
import { environment } from '@environments/environment';

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

    logoutTokens(accessToken?: string, refreshToken?: string) {
        if (!accessToken) {
            accessToken = this.cloudApiAccessToken;
        }
        if (!refreshToken) {
            refreshToken = this.cloudApiRefreshToken;
        }
        return this.http.post(
            `${this.CONFIG.cloudHost}/oauth/logout/`,
            { cloudAccessToken: accessToken, refreshToken }
        )
            .pipe(
                tap(() => {
                    this.storage.clear('cloudApiAccessToken');
                    this.storage.clear('cloudApiRefreshToken');
                })
            ).toPromise();
    }

    redirectOauth(state?: string, email?: string, code?: string) {
        const { href } = this.window.location;
        const cleanRedirect = (url) => {
            const [baseUrl, query] = url.split('?');
            const params = new URLSearchParams(query);
            if (params.has('code')) {
                params.delete('code');
            }
            const paramString = params.toString();
            return `${baseUrl}${paramString.length ? '?' + params.toString() : ''}`;
        };
        const clientTypes = {
            connect: 'connect',
            login: environment.isLocal ? 'loginWebadmin' : 'loginCloud',
            disconnect: 'passwordDisconnect',
            detach: 'passwordDetach',
            renew: 'renewWeb',
            reset: 'passwordReset',
            restart: 'passwordRestart'
        };
        const params = new URLSearchParams({
            client_type: clientTypes[state] || clientTypes.login,
            view_type: 'web',
            redirect_url: cleanRedirect(href),
            client_id: environment.isLocal ? 'webadmin' : 'cloud_portal',
            response_type: 'code',
            grant_type: 'password'
        });
        if (environment.isLocal) {
            params.append('scope', `${this.CONFIG.cloudHost.replace(/http?s:\/\//, '')} cloudSystemId=*`);
        }
        if (state) {
            params.append('state', state);
        }
        if (email) {
            params.append('email', email);
        }
        if (code) {
            params.append('access_code', code);
        }
        const host = environment.production
            ? `${this.CONFIG.cloudHost ?? ''}`
            : environment.cloudHost ? `https://${environment.cloudHost}` : this.CONFIG.cloudHost;
        this.window.location.href = `${host}/authorize?${params.toString()}`;
        return false;
    }

    setTokens(tokens) {
        this.storage.cloudApiAccessToken = tokens.access_token;
        this.storage.cloudApiRefreshToken = tokens.refresh_token;
    }
}
