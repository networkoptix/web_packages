import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { tap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { memoizeAsyncShort } from '@utils/memoize';

import { nxConfig } from './nx-config/config';
import type { IConfig } from './nx-config/config-types';
import { NxStorageService } from './storage.service';
import { windowFactory } from './window-provider';

@Injectable({
    providedIn: 'root',
})
export class OauthService {
    CONFIG: IConfig = nxConfig;
    protected window: Window = windowFactory();

    constructor(private http: HttpClient, private storage: NxStorageService) {}

    get cloudApiAccessToken() {
        return this.storage.cloudApiAccessToken;
    }

    get cloudApiRefreshToken() {
        return this.storage.cloudApiRefreshToken;
    }

    temporaryAuthToken = signal<string>(null);

    logoutTokens(accessToken?: string, refreshToken?: string) {
        if (!accessToken) {
            accessToken = this.cloudApiAccessToken;
        }
        if (!refreshToken) {
            refreshToken = this.cloudApiRefreshToken;
        }
        return this.http
            .post(`${this.CONFIG.cloudHost}/oauth/logout/`, {
                cloudAccessToken: accessToken,
                refreshToken,
            })
            .pipe(
                tap(() => {
                    this.storage.clear('cloudApiAccessToken');
                    this.storage.clear('cloudApiRefreshToken');
                }),
            )
            .toPromise();
    }

    @memoizeAsyncShort
    redirectOauth(
        state?: string,
        email?: string,
        code?: string,
        accessToken?: string,
        redirectTo?: string,
    ) {
        redirectTo ??= this.window.location.href;
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
            merge: 'passwordMerge',
            renew: 'renewWeb',
            renew2FA: 'renewWeb2FA',
            reset: 'passwordReset',
            restart: 'passwordRestart',
            system2faAuth: 'system2faAuth',
            transfer: 'passwordTransfer',
        };
        const params = new URLSearchParams({
            client_type: clientTypes[state] || clientTypes.login,
            view_type: 'web',
            redirect_uri: cleanRedirect(redirectTo),
            client_id: environment.isLocal ? 'webadmin' : 'cloud_portal',
            response_type: 'code',
            grant_type: 'password',
        });
        if (environment.isLocal) {
            params.append(
                'scope',
                `${this.CONFIG.cloudHost.replace(/http?s:\/\//, '')} cloudSystemId=${
                    this.CONFIG.cloudSystemId || '*'
                }`,
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
            : environment.cloudHost
            ? `https://${environment.cloudHost}`
            : this.CONFIG.cloudHost;
        this.window.location.href = `${host}/authorize?${params.toString()}`;
        return false;
    }

    add2fa(accessToken): void {
        const authorizeUrl = `${
            environment.isLocal ? '/#' : ''
        }/cloud-authorize?state=renew&access_token=${accessToken}`;
        this.window.open(authorizeUrl, '_blank').focus();
    }

    setTokens(tokens): void {
        this.storage.cloudApiAccessToken = tokens.access_token;
        this.storage.cloudApiRefreshToken = tokens.refresh_token;
    }
}
