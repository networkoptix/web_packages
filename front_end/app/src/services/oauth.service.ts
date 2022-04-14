import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';

import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
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

    redirectOauth(state?: string, email?: string, code?: string, accessToken?: string) {
        const { href } = this.window.location;
        const cleanRedirect = url => {
            const [baseUrl, query] = url.split('?');
            const params = new URLSearchParams(query);
            if (params.has('code')) {
                params.delete('code');
            }
            if (params.has('access_token')) {
                params.delete('access_token');
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
            restart: 'passwordRestart',
            system2faAuth: 'system2faAuth'
        };
        const params = new URLSearchParams({
            client_type: clientTypes[state] || clientTypes.login,
            view_type: 'web',
            redirect_uri: cleanRedirect(href),
            client_id: environment.isLocal ? 'webadmin' : 'cloud_portal',
            response_type: 'code',
            grant_type: 'password'
        });
        if (environment.isLocal) {
            params.append(
                'scope',
                `${this.CONFIG.cloudHost.replace(/http?s:\/\//, '')} cloudSystemId=*`
            );
        }
        if (state) {
            params.append('state', state);
        }
        if (email) {
            params.append('email', email);
        }
        if (code) {
            params.append('code', code);
        }

        if (accessToken) {
            params.append('access_token', accessToken);
        }
        const host = environment.production
            ? `${this.CONFIG.cloudHost ?? ''}`
            : environment.cloudHost ? `https://${environment.cloudHost}` : this.CONFIG.cloudHost;
        this.window.location.href = `${host}/authorize?${params.toString()}`;
        return false;
    }

    add2fa(accessToken) {
        const authorizeUrl = `${environment.isLocal ? '/#' : ''}/cloud-authorize?state=renew&access_token=${accessToken}`;
        window.open(authorizeUrl, '_blank').focus();
    }

    setTokens(tokens) {
        this.storage.cloudApiAccessToken = tokens.access_token;
        this.storage.cloudApiRefreshToken = tokens.refresh_token;
    }
}
