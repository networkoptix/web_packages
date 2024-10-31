import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { tap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { getOauthUrl, OauthConfig } from '@utils/general';
import { memoizeAsyncShort } from '@utils/memoize';

import { nxConfig } from './nx-config/config';
import type { IConfig } from './nx-config/config-types';
import { NxStorageService } from './storage.service';

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
        window.location.href = getOauthUrl(config);
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
