import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { iif, mergeMap, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';

type ApiData = { [key: string]: string | boolean | number };

const endpoints = {
    check: (email: string) => `account/${email}/status`,
    getAccount: 'account/get',
    activate: 'account/activate',
    reactivate: 'account/reactivate',
    register: 'account/register',
    resetPassword: 'account/resetPassword',
    restorePassword: 'account/self',
    token: 'oauth2/token',
    tokenV1: 'oauth2/v1/token',
    update: 'account/update',
    verifyBackupCode: 'account/self/2fa/backup-code',
    verifyTotp: 'account/self/2fa/totp/key',
};

// separate the client id into it's 3 parts. 1st part is the client id, 2nd part is the customization, 3rd part is the version. Each separated by a '/'
// example: desktop_client/default/6.0
// NOTE: the version was only added in 6.1 for desktop client
const deserializeClientId = (
    clientId: string,
): { client: string; customization?: string; version?: number } => {
    const [client, customization, version] = clientId.split('/');
    return { client, customization, version: version ? Number(version) : undefined };
};

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    readonly apiBase = '/cdb';
    readonly customization: string;

    constructor(
        config: NxConfigService,
        private httpClient: HttpClient,
    ) {
        this.customization = config.getConfig().customization;
    }

    private get(route: string, params?: ApiData, headers?: HttpHeaders): Observable<ApiData> {
        return this.httpClient.get<ApiData>(`${this.apiBase}/${route}`, { headers, params });
    }

    private post(route: string, data?: ApiData, headers?: HttpHeaders): Observable<ApiData> {
        return this.httpClient.post<ApiData>(`${this.apiBase}/${route}`, data, { headers });
    }

    private put(route: string, data?: ApiData, headers?: HttpHeaders): Observable<ApiData> {
        return this.httpClient.put<ApiData>(`${this.apiBase}/${route}`, data, { headers });
    }

    account(accessToken: string): Observable<ApiData> {
        const headers = new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
        return this.get(endpoints.getAccount, undefined, headers);
    }

    activate(code: string): Observable<ApiData> {
        return this.post(endpoints.activate, { code });
    }

    authenticate(
        email: string,
        password: string,
        clientId: string,
        redirectUrl?: string,
        state?: string,
        scope?: string,
    ): Observable<ApiData> {
        const data: ApiData = {
            password,
            username: email,
            grant_type: 'password',
            response_type: 'code',
        };

        let tokenEndpoint = nxConfig.featureFlags.oauthV1Enabled
            ? endpoints.tokenV1
            : endpoints.token;

        if (clientId) {
            const { client, version: clientVersion } = deserializeClientId(clientId);
            // desktop client version 6.0 and below should use the old token endpoint. Everything else should use new token endpoint.
            if (client === 'desktop_client' && (!clientVersion || clientVersion < 6.1)) {
                tokenEndpoint = endpoints.token;
            }
            if (['cloud', 'webadmin'].some(client => clientId === client)) {
                clientId = `${clientId}/${this.customization}`;
            }
            data.client_id = clientId;
        }

        if (scope) {
            // Drawback is this fix wont work in local dev mode, but fixes deployed code.
            if (scope.includes(window.location.hostname) && !scope.includes('https://')) {
                scope = `https://${scope}`;
            }
            data.scope = scope;
        }
        // TODO: Once client registration is supported verify clientId + redirectUrl before trying to get an access code.
        return this.post(tokenEndpoint, data).pipe(
            map(({ code, error }: { code: string; error: string }) => {
                const [link, qs] = redirectUrl?.split('?') || [window.location.origin];
                const params = new URLSearchParams(qs || '');
                params.set('code', code);

                if (state) {
                    params.set('state', state);
                }

                if (error) {
                    // eslint-disable-next-line @typescript-eslint/no-throw-literal
                    throw {
                        code,
                        errorText: error,
                        link: `${link}?${params.toString()}`,
                    };
                }

                return {
                    code,
                    link: `${link}?${params.toString()}`,
                };
            }),
        );
    }

    checkIfEmailExistsInCloud(email: string): Observable<ApiData> {
        return this.get(endpoints.check(email)).pipe(
            map(({ statusCode }) => ({
                active: statusCode === 'activated',
                emailExists: !!statusCode,
            })),
            catchError(() =>
                of({
                    active: false,
                    emailExists: false,
                }),
            ),
        );
    }

    reactivate(email: string): Observable<ApiData> {
        return this.post(endpoints.reactivate, { email });
    }

    register(
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        customization: string,
        code?: string,
    ): Observable<ApiData> {
        let headers = new HttpHeaders();
        if (code) {
            const [token] = atob(code).split(':');
            headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        }
        const data = {
            customization,
            email,
            password,
            fullName: `${firstName} ${lastName}`,
        };
        return this.post(`${code ? endpoints.update : endpoints.register}`, data, headers);
    }

    restorePassword(
        code: string,
        password: string,
        verificationCode?: string,
        isBackup?: boolean,
    ): Observable<ApiData> {
        const [token] = atob(code).split(':');
        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        const data = {
            currentPassword: token,
            password,
        };
        return iif(
            () => !verificationCode,
            of({}),
            isBackup
                ? this.verifyBackupCode(verificationCode, token)
                : this.verifyTotp(verificationCode, token),
        ).pipe(mergeMap(() => this.put(endpoints.restorePassword, data, headers)));
    }

    resetPassword(email: string): Observable<ApiData> {
        const { customization } = this;
        return this.post(endpoints.resetPassword, { email, customization });
    }

    verifyBackupCode(backupCode: string, token: string): Observable<ApiData> {
        return this.get(`${endpoints.verifyBackupCode}/${backupCode}`, { token });
    }

    verifyTotp(totp: string, token: string): Observable<ApiData> {
        return this.get(`${endpoints.verifyTotp}/${totp}`, { token });
    }
}
