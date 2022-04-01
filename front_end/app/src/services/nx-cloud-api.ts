/* eslint-disable camelcase */
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, of, from, BehaviorSubject, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import { catchError, concatMap, switchMap, map, tap } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { ConsoleSection } from '@components/console-table/console-table.component.types';
import { PackageStatus } from '@dialogs/download-async/download-async.component.types';
import { environment } from '@environments/environment';
import { NxConsoleService } from '@pages/developer-console/console/console.service';
import { FeatureFlagStrings } from '@services/nx-config/base-config';
import { OauthService } from '@services/oauth.service';
import { NxSwCacheService } from '@services/sw-cache.service';
import { mapValuesToStrings } from '@utils/general';

import { Account } from './account.service/account';
import type * as t from './nx-cloud-api.types';
import { InstantSearchOptions } from './nx-cloud-api.types';
import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxUriCacheService } from './uri-cache.service';

export const DOC_TYPES = {
    knowledgebase: 'kb',
    struct: 'struct'
};

const staffSWBypass = (target: Object, propertKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        return of('').pipe(
            switchMap(_ => {
                if (this.currentAccount !== undefined) {
                    return of(this.currentAccount);
                }
                return this.account(true);
            }),
            switchMap((account: Account) => {
                this.currentAccount = account;
                if (this.currentAccount?.is_staff) {
                    clearTimeout(this.swBypassTimeout);
                    this.swBypass = true;
                    this.swBypassTimeout = setTimeout(_ => {
                        this.swBypass = false;
                    }, 10000);
                }
                return originalMethod.apply(this, args);
            })
        );
    };
};

const swClear = (cacheName, url, toPromise) => (target: Object, propertKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        const returnPromise = this.nxSwCacheService.clearCache(cacheName, this.CONFIG.apiBase + url).then(_ => {
            return originalMethod.apply(this, args);
        });

        if (toPromise) {
            return returnPromise.then(response => {
                // Clear a second time to handle small chance of race condition
                return this.nxSwCacheService.clearCache(cacheName, this.CONFIG.apiBase + url).then(_ => {
                    return response;
                });
            });
        } else {
            return from(returnPromise)
                .pipe(
                    switchMap((result: any) => result),
                    concatMap(response => {
                        // Clear a second time to handle small chance of race condition
                        return this.nxSwCacheService.clearCache(cacheName, this.CONFIG.apiBase + url).then(_ => {
                            return response;
                        });
                    })
                );
        }
    };
};

export class CustomClientAPI {
    private readonly apiBase: string;

    constructor(
        private cloudAPI: NxCloudApiService,
        private config: IConfig,
        private http: HttpClient,
        private consoleService: NxConsoleService
    ) {
        this.apiBase = this.config.apiBase + '/custom_clients/';
    }

    create = (name: string, baseVms?, values: Record<string, string> = {}) => {
        if (!Object.keys(values).length) {
            const id = uuid();
            this.consoleService.unsavedAssets[id] = { name, base_vms: baseVms, id, unsaved: true, values: {} };
            return Promise.reject(id);
        }
        const body: any = { name };
        if (Object.entries(values).length) {
            body.values = values;
        }

        if (baseVms) {
            body.base_vms = baseVms;
        }
        return this.http.post<t.CustomClient>(this.apiBase, body);
    };

    retrieve = id => {
        return this.http.get<t.CustomClient>(`${this.apiBase}${id}/`);
    };

    list = () => {
        return this.http.get<t.CustomClient[]>(this.apiBase);
    };

    update = (id, name, values) => {
        return this.http.put<t.CustomClient>(`${this.apiBase}${id}/`, { name, values });
    };

    partialUpdate = (id, name?, data: Record<string, any> = {}, values: Record<string, any> = {}) => {
        if (name !== undefined) {
            data.name = name;
        }
        data.values = { ...(data.values || {}), ...values };
        return this.http.patch<t.CustomClient>(`${this.apiBase}${id}/`, data);
    };

    destroy = id => {
        return this.http.delete(`${this.apiBase}${id}/`);
    };

    getManifest = () => {
        return this.http.get<t.ContentManifest>(`${this.apiBase}get_manifest/`);
    };

    generatePackage = <Id, DownloadId = { downloadId: string }>(id: Id) => {
        return this.http.post<DownloadId>(`${this.apiBase}${id}/generate_package/`, {});
    };

    checkPackage = <Id, DownloadId>(id: Id, downloadId: DownloadId) => {
        return this.http.get<PackageStatus>(`${this.apiBase}${id}/check_package/?downloadId=${downloadId}`);
    };

    getDownloadUrl = <Id, DownloadId>(id: Id, downloadId: DownloadId) => `${this.apiBase}${id}/download_package/?downloadId=${downloadId}`;
}

@Injectable({
    providedIn: 'root'
})
export class NxCloudApiService {
    private CONFIG: IConfig;
    public currentAccount: Account; // Used by staffSWBypass decorator
    public swBypass = false;
    public swBypassTimeout: ReturnType<typeof setTimeout>;
    public customClient: CustomClientAPI;

    constructor(
        private configService: NxConfigService,
        private http: HttpClient,
        private cacheService: NxUriCacheService,
        private router: Router,
        private nxSwCacheService: NxSwCacheService,
        private injector: Injector,
        private consoleService: NxConsoleService,
        private oauthService: OauthService
    ) {
        this.CONFIG = configService.getConfig();
        this.customClient = new CustomClientAPI(this, this.CONFIG, this.http, this.consoleService);
    }

    getSubAPI(route: ConsoleSection) {
        switch (route) {
            case 'custom-clients':
                return this.customClient;
            default:
                return {
                    list: (...args) => new BehaviorSubject([]),
                    getManifest: () => new BehaviorSubject({ manifest: { contexts: {} } }),
                    retrieve: id => new BehaviorSubject({})
                };
        }
    }

    checkResponseHasError<T extends any>(data: any) {
        // this is not a repetition
        if (data?.resultCode && data.resultCode !== this.CONFIG.responseOk) {
            return data;
        }
        return false;
    }

    @swClear('cloudSystemAPI', '/systems', false)
    disconnect(systemId: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/systems/disconnect', {
            system_id: systemId
        });
    }

    @swClear('cloudSystemAPI', '/systems', false)
    connect(systemName, email, password) {
        const accessToken = this.oauthService.cloudApiAccessToken;
        let headers = new HttpHeaders();
        if (accessToken) {
            headers = headers.set('Authorization', `Bearer ${accessToken}`);
        }
        return this.http.post<t.CloudResponse>(this.configService.cloudHost + this.CONFIG.apiBase + '/systems/connect', {
            name: systemName,
            email: email,
            password: password
        }, { headers }).pipe(
            tap(() => {
                if (accessToken) {
                    return this.oauthService.logoutTokens();
                }
            })
        );
    }

    verify(password) {
        return this.http.post(this.CONFIG.apiBase + '/account/verify', {
            password: password
        }).toPromise();
    }

    update2fa(password, mfaCode, action) {
        return this.http.post<t.CloudResponse>(
            this.CONFIG.apiBase + '/account/security',
            { password, mfaCode, action }
        ).toPromise();
    }

    deactivate2FaKey() {
        return this.http.delete<t.CloudResponse>(this.CONFIG.apiBase + '/account/security').toPromise();
    }

    get2FaKey() {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/2fa/verification', {}).toPromise();
    }

    get2FaBackupCode() {
        return this.http.post<t.TwoFactorBackupCodes[]>(this.CONFIG.apiBase + '/2fa/backup', {}).toPromise();
    }

    verify2FaKey(code, verificationCode) {
        const uri = `${this.CONFIG.apiBase}/2fa/verification?verification_code=${verificationCode}&code=${code}`;
        return this.http.get(uri).toPromise();
    }

    updateSessionWith2fa(verificationCode) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/2fa/updateSession', {
            verification_code: verificationCode
        }).toPromise();
    }

    toggle2faForSystem(systemId, mfaCode) {
        return this.http.post(this.CONFIG.apiBase + '/systems/toggle2fa', { systemId, mfaCode }).toPromise();
    }

    getStaticLanding() {
        const httpOptions = {
            headers: new HttpHeaders({ 'Content-Type': 'application/text' }),
            responseType: 'text' as 'text'
        };
        return this.http.get('/' + this.CONFIG.viewsDir + 'static/landing.html', httpOptions);
    }

    getStatic(url) {
        const httpOptions = {
            headers: new HttpHeaders({ 'Content-Type': 'application/text' }),
            responseType: 'text' as 'text'
        };
        return this.http.get(url, httpOptions);
    }

    getCommonPasswords() {
        return this.http.get<{ [key: string]: number; }>('/static/scripts/commonPasswordsList.json');
    }

    @staffSWBypass
    getIntegrations() {
        return this.http.get<{ data: t.Integration[] }>(this.CONFIG.apiBase + '/cms/integrations');
    }

    getIntegrationsCount() {
        return this.http.get<t.IntegrationCount>(this.CONFIG.apiBase + '/cms/integration_count');
    }

    @staffSWBypass
    getIntegrationBy(id: number, status: string) {
        let uri = this.CONFIG.apiBase + '/cms/integration/' + id;
        uri += (status) ? '?' + status : '';

        return this.http.get<Array<t.Integration>>(uri);
    }

    getIPVD() {
        return this.http.get<t.IPVDCameras>(this.CONFIG.apiBase + '/ipvd');
    }

    @swClear('cloudSystemAPI', '/systems', false)
    getCode(systemId: string) {
        return this.http.post<any>(`${this.CONFIG.apiBase}/systems/${systemId}/code`, {});
    }

    @swClear('cloudSystemAPI', '/systems', false)
    getSystemAuth(systemId: string) {
        return this.http.get<t.SystemAuth>(`${this.CONFIG.apiBase}/systems/${systemId}/auth`);
    }

    @swClear('cloudSystemAPI', '/systems', false)
    getSystemToken(systemId: string) {
        return this.http.post<any>(`${this.CONFIG.apiBase}/systems/${systemId}/token`, {});
    }

    @swClear('cloudSystemAPI', '/systems', true)
    merge(masterSystemId: string, slaveSystemId: string, password: string) {
        return this.http.post<t.CloudResponse>(`${this.CONFIG.apiBase}/systems/merge`, {
            master_system_id: masterSystemId,
            slave_system_id: slaveSystemId,
            password
        }).toPromise();
    }

    notificationSend(userEmail: string, type: string, message: string) {
        return this.http.post(`${this.CONFIG.apiBase.replace('/api', '/notifications')}/send`, {
            user_email: userEmail,
            type,
            message
        }).toPromise();
    }

    @staffSWBypass
    getOpenAPIJSONs() {
        return this.http.get<{ data: t.OpenAPIJSON[] }>(this.CONFIG.apiBase + '/cms/openapi_jsons');
    }

    // not used, except in debug
    reloadIPVD() {
        return this.http.post(this.CONFIG.apiBase + '/ipvd', {});
    }

    registerUser(
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        code: string
    ) {
        return this.http
            .post<t.RegisterUser>(this.CONFIG.apiBase + '/account/register',
                {
                    email,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                    code
                })
            .toPromise();
    }

    reactivateUser(userEmail: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/activate',
            { user_email: userEmail }).toPromise();
    }

    @swClear('cloudSystemAPI', '/systems', true)
    renameSystem(systemId: string, systemName: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/systems/' + systemId + '/name', {
            name: systemName
        }).toPromise().then(result => {
            // this.systems('clearCache');
            return result;
        });
    }

    sendMessage(
        type: string,
        asset: string,
        message: string,
        userName?: string,
        userEmail?: string
    ) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/feedback', {
            message, asset, type, userName, userEmail
        });
    }

    systems(systemId?: string) {
        if (systemId) {
            return this.http.get<any[]>(this.CONFIG.apiBase + '/systems/' + systemId);
        }
        return this.http.get<any[]>(this.CONFIG.apiBase + '/systems');
    }

    users(systemId: string) {
        return this.http.get<t.CloudUsers>(`${this.CONFIG.apiBase}/systems/${systemId}/users`);
    }

    unshare(systemId: string, userEmail: string, password?: string) {
        let url = `${this.CONFIG.apiBase}/systems/${systemId}/users`;
        const data: any = {
            user_email: userEmail,
            role: this.CONFIG.accessRoles.unshare
        };
        if (environment.isLocal) {
            url = `${this.configService.cloudHost}/api/systems/${systemId}/users`;
            data.email = userEmail;
            data.password = password || '';
        }
        return this.http.post(url, data);
    }

    authKey() {
        return this.http.post<t.AuthKey>(this.CONFIG.apiBase + '/account/authKey', {}).toPromise();
    }

    visitedKey(key: string) {
        return this.http.get<t.VisitedKey>(this.CONFIG.apiBase + '/utils/visitedKey/?key=' + encodeURIComponent(key)).toPromise();
    }

    checkCode(code: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/checkCode', { code }).toPromise();
    }

    checkAuthCode(code: string) {
        return this.http.post<t.AuthCode>(this.CONFIG.apiBase + '/account/checkAuthCode', { code }).toPromise();
    }

    checkIfEmailExistsInCloud(email: string) {
        return this.http.post<t.CheckEmailExists>(this.CONFIG.apiBase + '/account/check', { email }).toPromise();
    }

    authenticate(email: string, password: string, clientId: string, redirectUrl: string, responseType: string, state?: string, scope?: string, signature?: string) {
        const body: any = {
            email,
            password,
            client_id: clientId,
            redirect_uri: redirectUrl,
            response_type: responseType
        };
        state && (body.state = state);
        scope && (body.scope = scope);
        signature && (body.signature = signature);

        return this.http.post<any>('/oauth/authenticate', body).toPromise();
    }

    verifyCode(verification_code: string, code: string) {
        const url = `${this.CONFIG.apiBase}/2fa/verification?verification_code=${verification_code}&code=${code}`;
        return this.http.get<any>(url);
    }

    verifyBackupCode(verification_code: string, code: string) {
        const url = `${this.CONFIG.apiBase}/2fa/backup?verification_code=${verification_code}&code=${code}`;
        return this.http.get<any>(url);
    }

    @swClear('apiFresh', '/account', true)
    login(email: string, password: string, remember: boolean) {
        // clearCache();
        return this.http.post<Account>(this.CONFIG.apiBase + '/account/login', {
            email,
            password,
            remember,
            timezone: (Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || ''
        }).toPromise();
    }

    @swClear('apiFresh', '/account', true)
    loginCode(code: string) {
        return this.http.post(this.CONFIG.apiBase + '/account/loginCode', { code }).pipe(
            tap((account: Account) => { this.currentAccount = account; })
        ).toPromise();
    }

    @swClear('apiFresh', '/account', true)
    loginTokens(tokensInfo) {
        const options = {
            headers: {
                Authorization: `Bearer ${tokensInfo.access_token}`
            }
        };
        return this.http.post(this.CONFIG.apiBase + '/account/loginTokens', tokensInfo, options).toPromise();
    }

    @swClear('apiFresh', '/account', true)
    logout() {
        // clearCache();
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/logout', {}).toPromise();
    }

    deleteCloudUser(password) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/delete', { password }).toPromise();
    }

    account(forceUpdate = false) {
        const endpoint = this.CONFIG.apiBase + '/account';
        this.cacheService.addToCache(endpoint);
        let headers = new HttpHeaders();
        if (forceUpdate) {
            headers = headers.set('reset-cache', 'reset');
        }
        return this.http.get<Account>(endpoint, { headers })
            .pipe(
                map(account => {
                    account.isCloud = true;
                    this.currentAccount = account;
                    return account;
                })
            );
    }

    getCustomAccountProperty(property: string, username?: string) {
        const endpoint = `${this.CONFIG.apiBase}/custom-properties/${property}${username ? '/' + username : ''}`;
        return this.http.get<any>(endpoint);
    }

    saveCustomAccountProperty(payload: any, property: string, username?: string) {
        const endpoint = `${this.CONFIG.apiBase}/custom-properties/${property}${username ? '/' + username : ''}`;
        return this.http.post<any>(endpoint, payload);
    }

    getLanguages() {
        const endpoint = '/static/languages.json';
        this.cacheService.addToCache(endpoint);
        return this.http.get<t.ILanguages>(endpoint).toPromise();
    }

    @swClear('apiFresh', '/utils/language', true)
    changeLanguage(language: string) {
        return this.http.post(this.CONFIG.apiBase + '/utils/language/', {
            language
        }).toPromise();
    }

    getDownloads() {
        return this.http.get<t.Downloads>(this.CONFIG.apiBase + '/utils/downloads').toPromise();
    }

    getDownloadsHistory(build: string) {
        return this.http.get(this.CONFIG.apiBase + '/utils/downloads/' + (build || 'history')).toPromise();
    }

    accountPost(account: Account) {
        // strip unnecessary account info
        const accountInfo = {
            email: account.email,
            first_name: account.first_name,
            last_name: account.last_name,
            is_staff: account.is_staff,
            is_superuser: account.is_superuser || false,
            language: account.language,
            permissions: account.permissions
        };
        return this.http.post<t.AccountEdit>(this.CONFIG.apiBase + '/account', accountInfo).toPromise();
    }

    changePassword(newPassword: string, oldPassword: string, mfaCode?: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/changePassword', {
            new_password: newPassword,
            old_password: oldPassword,
            mfaCode
        }).toPromise();
    }

    reactivate(userEmail: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/activate', {
            user_email: userEmail
        }).toPromise();
    }

    activate(code: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/activate', {
            code
        }).toPromise();
    }

    restorePasswordRequest(userEmail: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/restorePassword', {
            user_email: userEmail
        }).toPromise();
    }

    restorePassword(code: string, newPassword: string, mfaCode?: string, isBackup = false) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/restorePassword', {
            code,
            new_password: newPassword,
            mfaCode,
            isBackup
        }).toPromise();
    }

    acceptAgreement(reviewId: string) {
        return this.http.post(this.CONFIG.apiBase + '/cms/accept_agreement', {
            review_id: reviewId
        }).toPromise();
    }

    acceptReview(reviewId: number) {
        return this.http.post(this.CONFIG.apiBase + '/cms/accept_review', {
            review_id: reviewId
        }).toPromise().then(response => {
            this.cacheService.clearData();
            return response;
        });
    }

    /* Ownership transfer */
    getTransfers(): Observable<t.SystemTransferInfo[]> {
        return this.http.get<t.SystemTransferInfo[]>(
            `${this.CONFIG.apiBase}/transfer/`
        );
    }

    startTransfer(
        systemId: string,
        newOwnerEmail: string,
    ): Observable<t.SystemTransferInfo> {
        return this.http.post<t.SystemTransferInfo>(
            `${this.CONFIG.apiBase}/transfer/${systemId}/`,
            { newOwnerEmail },
        );
    }

    cancelTransfer(systemId: string): Observable<unknown> {
        return this.http.delete<unknown>(`${this.CONFIG.apiBase}/transfer/${systemId}/`);
    }

    respondToTransfer(
        systemId: string,
        action: 'accepted' | 'rejected'
    ): Observable<t.CloudResponse> {
        return this.http.put<t.CloudResponse>(
            `${this.CONFIG.apiBase}/transfer/${systemId}/`,
            { action },
        );
    }

    // Cloud Storage

    enableCloudStorage(systemId: string) {
        return this.http.post<t.CloudStorage>(this.CONFIG.apiBase + '/storage/create', {
            systemId
        }).toPromise();
    }

    /**
     * Expected repsonse:
     *
     * {
     *    enabled           : true,
     *    cloudCapacity     : 53687091200,
     *    currentRecordings : 7457136000, // ms, rounded to the hour
     *    whenFullyUsed     : 1209600000, // ms, rounded to the hour
     *    amountUsed        : 17424682320, // bytes rounded to 0.1 Gb, percent calculated and rounded to 1%
     *    archiveFrom       : 11, // number of cameras represented by integer
     *    recordingBitrate  : 1500000, // bps rounded to 0.1 Mbps
     *    delayFromLive     : 1200000 // ms, rounded to 0.1s}
     *}
     * @param systemId
     */
    getCloudStorageUsage(systemId: string): Promise<any> {
        return this.http.get<t.CloudStorageUsage>(this.CONFIG.apiBase + '/storage/usageStats', {
            params: {
                systemId
            }
        }).toPromise();
    }

    @staffSWBypass
    getDocumentation(name, type, assetIdOrSearchObject?: string | number | { query: string | number, page?: number }, state?: string, assetVersion?: number) {
        let endpoint = name ? `/${type}/${name}` : '';
        let params = new HttpParams();
        if (typeof assetIdOrSearchObject === 'string' || typeof assetIdOrSearchObject === 'number') {
            const urlAppend = assetIdOrSearchObject ? `/${assetIdOrSearchObject}` : '';
            if (type === DOC_TYPES.knowledgebase) {
                endpoint = urlAppend;
            } else {
                endpoint += urlAppend;
            }
        } else if (assetIdOrSearchObject?.query) {
            params = params.set('filter', `${assetIdOrSearchObject.query}`);
            params = params.set('page', assetIdOrSearchObject.page ? assetIdOrSearchObject.page.toString() : '1');
        }
        if (state) {
            params = params.set('state', state.replace('pending', 'review'));
        }
        if (assetVersion) {
            params = params.set('version', assetVersion.toString());
        }
        const route = `${this.CONFIG.apiBase}/cms/documentation${endpoint}?${params.toString()}`;
        this.cacheService.addToCache(route);
        return this.http.get<any>(route).pipe(catchError(error => {
            if (error.status === 404) {
                this.#show404();
                return EMPTY;
            } else {
                return of(error);
            }
        }));
    }

    @staffSWBypass
    documentationInstantSearch(name, query, options?: Partial<InstantSearchOptions>) {
        if (!this.CONFIG.featureFlags.kbInstantSearch) {
            return throwError(new Error('Instant search feature not enabled'));
        }
        const params = mapValuesToStrings({ query, ...options });
        const urlSearchParams = new URLSearchParams(params).toString();
        const route = `${this.CONFIG.apiBase}/cms/documentation/kb/${name}/search?${urlSearchParams}`;
        this.cacheService.addToCache(route);
        return this.http.get<any>(route, { headers: { 'cache-request': 'true' } });
    }

    getDocAsset(assetId) {
        const route = `${this.CONFIG.apiBase}/cms/documentation/${assetId}`;
        return this.http.get<t.DocAsset>(route)
            .pipe(catchError(_ => of(<t.DocAsset>{ blocks: [], id: null, shortDescription: null, title: null })));
    }

    findArticleKB(assetId) {
        return this.http.get<any>(`${this.CONFIG.apiBase}/cms/documentation/find_kb/${assetId}`).pipe(catchError(error => {
            if (error.status === 404) {
                if (error.error.errorText === 'Kb not found') {
                    this.router.navigate(['/'], { skipLocationChange: true }).then(_ =>
                        this.router.navigate([`/docs/content/${assetId}`])
                    );
                } else {
                    this.#show404();
                }
                return EMPTY;
            } else {
                return of(error);
            }
        }));
    }

    #show404 = () => {
        this.router
            .navigate([this.CONFIG.redirect.page404], {
                replaceUrl: true
            })
            .catch(error => {
                console.error(error);
            });
    };

    getTimeSinceLogin() {
        return this.http.get<any>(this.CONFIG.apiBase + '/account/timeSincePassword');
    }

    getTokensFromCloud(code: string) {
        const params = {
            code,
            grant_type: 'authorization_code',
            response_type: 'token'
        };
        return this.http.get(`${this.CONFIG.cloudHost}/oauth/token/`, { params });
    }

    getTokenInfo(token: string) {
        return this.http.get(this.CONFIG.cloudHost + '/oauth/introspect/', { params: { token } });
    }

    logoutTokens(accessToken: string, refreshToken: string) {
        return this.oauthService.logoutTokens(accessToken, refreshToken);
    }

    getAssets = (maxAge = 0, params) => this.http.get<{ last: string, data: t.ExplorerNode[] }>(`${this.CONFIG.apiBase}/assets`, { params: { maxAge, ...params } });

    testEmailNotification(emailNotificationPayload: t.EmailNotification) {
        return this.http.post(this.CONFIG.apiBase + '/notifications/email_notification', emailNotificationPayload);
    }
}
