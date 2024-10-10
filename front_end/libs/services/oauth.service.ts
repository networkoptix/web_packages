import { HttpClient } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { useNewCloud } from '@utils/general';
import { memoizeAsyncShort } from '@utils/memoize';

import { nxConfig } from './nx-config/config';
import type { IConfig } from './nx-config/config-types';
import { NxStorageService } from './storage.service';

interface OauthConfig {
    state?: string;
    email?: string;
    code?: string;
    accessToken?: string;
    redirectTo?: string;
    systemName?: string;
}

@Injectable({
    providedIn: 'root',
})
export class OauthService {
    CONFIG: IConfig = nxConfig;

    constructor(
        private http: HttpClient,
        private storage: NxStorageService,
    ) {}

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
        return firstValueFrom(
            this.http
                .post(`${this.CONFIG.cloudHost}/oauth/logout/`, {
                    cloudAccessToken: accessToken,
                    refreshToken,
                })
                .pipe(
                    tap(() => {
                        this.storage.clear('cloudApiAccessToken');
                        this.storage.clear('cloudApiRefreshToken');
                    }),
                ),
        );
    }

    @memoizeAsyncShort
    redirectOauth(config?: OauthConfig) {
        let { redirectTo, state, email, code, accessToken, systemName } = config ?? {};
        redirectTo ??= window.location.href;
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
            login: environment.isWebadmin ? 'loginWebadmin' : 'loginCloud',
            disconnect: 'passwordDisconnect',
            detach: 'passwordDetach',
            merge: 'passwordMerge',
            renewWeb: 'renewWeb',
            renew2FA: 'renewWeb2FA',
            reset: 'passwordReset',
            restart: 'passwordRestart',
            system2faAuth: 'system2faAuth',
            transfer: 'passwordTransfer',
        };
        const params = new URLSearchParams({
            client_type: (state && clientTypes[state]) || clientTypes.login,
            view_type: 'web',
            redirect_uri: cleanRedirect(redirectTo),
            client_id: environment.isWebadmin ? 'webadmin' : 'cloud_portal',
            response_type: 'code',
            grant_type: 'password',
        });
        if (environment.isWebadmin) {
            params.append(
                'scope',
                `${this.CONFIG.cloudHost.replace(/http?s:\/\//, '')} cloudSystemId=${
                    this.CONFIG.cloudSystemId || '*'
                }`,
            );
        }
        if (systemName) {
            params.append('system_name', systemName);
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
        const host = !isDevMode()
            ? `${this.CONFIG.cloudHost ?? ''}`
            : environment.cloudHost
              ? `https://${environment.cloudHost}`
              : this.CONFIG.cloudHost;
        if (useNewCloud()) {
            window.location.href = `${window.location.origin}?${params.toString()}`;
        } else {
            window.location.href = `${host}/authorize?${params.toString()}`;
        }
        return false;
    }

    add2fa(accessToken): void {
        const authorizeUrl = `${
            environment.isWebadmin ? '/#' : ''
        }/cloud-authorize?state=renew&access_token=${accessToken}`;
        window.open(authorizeUrl, '_blank').focus();
    }

    setTokens(tokens): void {
        this.storage.cloudApiAccessToken = tokens.access_token;
        this.storage.cloudApiRefreshToken = tokens.refresh_token;
    }
}
