import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import md5 from 'md5';
import { Observable, zip } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { WINDOW } from '@services/window-provider';

import { CloudResponse, CloudUsers, System, WithFreshSession } from '../../nx-cloud-api.types';
import { BaseCloudServiceAPI, CreateApiFactory, implementsCloudServiceApi } from '../base-cloud-service-api';

enum NonSystemIdEndpoint {
    getCloudUsers = 'getCloudUsers',
    share = 'share',
    rename = 'rename',
    getAccessRoleList = 'getAccessRoleList',
    bind = 'bind',
    get = 'get'
}

enum SystemIdEndpoint {
    merge = 'merged_systems',
}

interface ShareBody {
    accountEmail: string;
    accessRole: string;
    systemId: string;
    isEnabled
}

const getWindow = (): Window => inject(WINDOW);

@implementsCloudServiceApi
export class CloudDbAPI extends BaseCloudServiceAPI {
    /**
     * Api base CloudDbAPI.
     */
    static readonly API_BASE = '/cdb';

    /**
     * Create's a factory for instancating a CloudDbAPI.
     *
     * @param config IConfig
     * @param http HttpClient
     * @param withFreshSession WithFreshSession
     * @returns (serverUrl?: string, cloudHost?: string) => CloudDbAPI
     */
    static createApiFactory: CreateApiFactory<CloudDbAPI> = (http: HttpClient, withFreshSession: WithFreshSession, refreshToken: Observable<string>) => (serverUrl: string = '', hostOrCustomization: () => string = () => '') => new CloudDbAPI(serverUrl, hostOrCustomization, http, withFreshSession, refreshToken);

    #refreshToken$: Observable<string>;
    window = getWindow();

    constructor(serverUrl: string, hostOrCustomization: () => string, http: HttpClient, withFreshSession: WithFreshSession, refreshToken: Observable<string>) {
        super(serverUrl, CloudDbAPI.API_BASE, hostOrCustomization, http, withFreshSession);
        this.#refreshToken$ = refreshToken;
    }

    /** CloudDB System Endpoints */

    private systemEndpoint(): string;
    private systemEndpoint(endpoint: NonSystemIdEndpoint): string;
    private systemEndpoint(endpoint: SystemIdEndpoint, systemId: string): string;
    private systemEndpoint(endpoint = 'get', systemId = ''): string {
        return ['/system', systemId, endpoint].filter(segment => !!segment).join('/');
    }

    public systems(systemId = ''): Observable<System[]> {
        return this.get(this.systemEndpoint(NonSystemIdEndpoint.get), { params: systemId ? { systemId } : { customization: this.hostOrCustomization() } }).pipe(map(({ systems }) => systems));
    }

    public getCloudUsers(systemId = ''): Observable<CloudUsers> {
        return this.get(this.systemEndpoint(NonSystemIdEndpoint.getCloudUsers), { params: { systemId } }).pipe(map(({ sharing }) => sharing));
    }

    public sharing(systemId: string): Observable<CloudUsers>;
    public sharing(systemId: string, body: ShareBody): Observable<CloudResponse>;
    public sharing(systemId: string, body?: ShareBody): Observable<unknown> {
        if (body) {
            body.systemId = systemId;
            return this.post(this.systemEndpoint(NonSystemIdEndpoint.share), { body });
        }
        return this.getCloudUsers(systemId);
    }

    public rename(systemId: string, name: string): Observable<CloudResponse> {
        return this.post(this.systemEndpoint(NonSystemIdEndpoint.rename), { body: { systemId, name } });
    }

    /** CloudDB Auth Endpoints */

    private tokenHandler(systemId: string, responseType: 'token'): Observable<{ access_token: string, refresh_token: string }>;
    private tokenHandler(systemId: string, responseType: 'code'): Observable<{ access_code: string, code: string }>;
    private tokenHandler(systemId: string, responseType: string): Observable<unknown> {
        return this.#refreshToken$.pipe(
            map(code => ({
                client_id: 'cloud_portal',
                grant_type: 'authorization_code',
                response_type: responseType,
                scope: systemId === '*' ? undefined : `${this.window.location.host} cloudSystemId=${systemId}`,
                code
            })),
            switchMap(body => this.post<{ code: string }>(this.authEndpoint('token'), { body }))
        );
    }

    private authEndpoint(...segments: string[]): string {
        const endpointsFor2fa = ['backup-code', 'totp'];
        const other = {
            getNonce: '/auth',
            createTemporaryCredentials: '/account'
        };
        const mainSegment = segments[0];
        const base = endpointsFor2fa.includes(mainSegment) ? '/account/self/2fa' : other[mainSegment] || '/oauth2';
        return [base, ...segments].filter(segment => !!segment).join('/');
    }

    public getCode(systemId = '*'): Observable<{ code: string }> {
        return this.tokenHandler(systemId, 'code');
    }

    public getToken(systemId = '*'): Observable<{ access_token: string, refresh_token: string }> {
        return this.tokenHandler(systemId, 'token');
    }

    public getAuth(systemId = '*', realm = 'VMS'): Observable<{ authGet: string, authPost: string, authPlay: string }> {
        const digestFactory = (login: string, password: string, nonce: string) => (method: string) => {
            const loginDigest = md5(`${login}:${realm}:${password}`);
            const methodDigest = md5(`${method}:`);
            const authDigest = md5(`${loginDigest}:${nonce}:${methodDigest}`);
            const auth = `${login}:${nonce}:${authDigest}`;
            return btoa(auth);
        };

        return zip(
            this.getNonce(systemId),
            this.createTemporaryCredentials()
        ).pipe(
            map(([
                { nonce }, { login, password }
            ]) => {
                const digest = digestFactory(login, password, nonce);
                return {
                    authGet: digest('GET'),
                    authPost: digest('POST'),
                    authPlay: digest('PLAY')
                };
            })
        );
    }

    public createTemporaryCredentials(type = 'short', expirationPeriod = '', prolongationPeriod = '', autoProlongationEnabled = false): Observable<{ login: string, password: string }> {
        const body = {
            timeouts: {
                autoProlongationEnabled,
                expirationPeriod,
                prolongationPeriod
            },
            type
        };

        for (const property in body.timeouts) {
            if (!body.timeouts[property]) {
                delete body.timeouts[property];
            }
        }
        return this.post(this.authEndpoint('createTemporaryCredentials'), { body });
    }

    public getNonce(systemId: string): Observable<{ nonce: string }> {
        return this.get(this.authEndpoint('getNonce'), { params: { systemId } });
    }

    public validateToken(token: string): Observable<{ sessionExpires: number }> {
        return this.get<{ expires_at: string }>(this.authEndpoint('token', token)).pipe(
            map(info => ({ sessionExpires: parseInt(info.expires_at || '0') }))
        );
    }

    public getAccountSecurity(): Observable<{ account2faEnabled: boolean, totpExistsForAccount: boolean }> {
        return this.get('/account/self/settings/security').pipe(
            map(({ account2faEnabled, totpExistsForAccount }) => ({ account2faEnabled, totpExistsForAccount }))
        );
    }
}
