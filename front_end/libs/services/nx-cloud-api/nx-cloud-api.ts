/* eslint-disable camelcase */
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import * as FullStory from '@fullstory/browser';
import { CookieService } from 'ngx-cookie-service';
import { EMPTY, of, from, BehaviorSubject, throwError, defer, forkJoin } from 'rxjs';
import type { Observable } from 'rxjs';
import { catchError, concatMap, switchMap, map, tap, shareReplay, filter } from 'rxjs/operators';

import { ConsoleSection } from '@components/console-table/console-table.component.types';
import { environment } from '@environments/environment';
import { NxConsoleService } from '@pages/developer-console/console/console.service';
import { OauthService } from '@services/oauth.service';
import { NxSwCacheService } from '@services/sw-cache.service';
import { WINDOW } from '@services/window-provider';
import { apiBase, redirect, responseOk, staticBase } from '@static-variables';
import { mapValuesToStrings } from '@utils/general';
import { memoizeAsyncLong, memoizeAsyncPersistent, memoizeAsyncShort } from '@utils/memoize';

import { Account, CloudAccount } from '../account.service/account';
import { nxConfig } from '../nx-config/config';
import { NxUriCacheService } from '../uri-cache.service';

import { ChannelPartnersApi } from './cloud-services/channel-partners/channel-partners-api';
import { CloudDbAPI } from './cloud-services/cloud-db/cloud-db-api';
import { CloudStorageAPI } from './cloud-services/cloud-storage/cloud-storage-api';
import { DocDbAPI } from './cloud-services/doc-db/doc-db-api';
import { DocHandler } from './cloud-services/doc-db/doc-handler';
import { LicenseServerAPI } from './cloud-services/license-server/license-server-api';
import { TokenSessionManager } from './cloud-session-manager';
import { CustomAccountProperty } from './custom-account-property';
import { CustomClientAPI } from './custom-client-api';
import * as t from './nx-cloud-api.types';
import { DownloadReleases, TosInfo } from './nx-cloud-api.types';

type ResponseTypes = 'arraybuffer' | 'blob' | 'text' | 'json';

interface RequestOpts {
    headers?: HttpHeaders;
    responseType?: ResponseTypes;
}

interface WithOptionalJson extends RequestOpts {
    responseType?: 'json';
}

interface WithResponseType<RT extends ResponseTypes> extends RequestOpts {
    responseType: RT;
}
const staffSWBypass = (target: Object, propertyKey: string, descriptor: PropertyDescriptor) => {
    // CLOUD-9104: Firefox does not support service workers in private mode.
    // this isn't in the scope so we are using window by itself
    if (!('serviceWorker' in window.navigator)) {
        return;
    }
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
            }),
        );
    };
};

const swClear =
    (cacheName, url, toPromise) =>
    (target: Object, propertyKey: string, descriptor: PropertyDescriptor) => {
        // CLOUD-9104: Firefox does not support service workers in private mode.
        // this isn't in the scope so we are using window by itself
        if (!('serviceWorker' in window.navigator)) {
            return;
        }
        const originalMethod = descriptor.value;
        descriptor.value = function (...args) {
            const returnPromise = this.nxSwCacheService
                .clearCache(cacheName, apiBase + url)
                .then(_ => {
                    return originalMethod.apply(this, args);
                });

            if (toPromise) {
                return returnPromise.then(response => {
                    // Clear a second time to handle small chance of race condition
                    return this.nxSwCacheService.clearCache(cacheName, apiBase + url).then(_ => {
                        return response;
                    });
                });
            } else {
                return from(returnPromise).pipe(
                    switchMap((result: any) => result),
                    concatMap(response => {
                        // Clear a second time to handle small chance of race condition
                        return this.nxSwCacheService
                            .clearCache(cacheName, apiBase + url)
                            .then(_ => {
                                return response;
                            });
                    }),
                );
            }
        };
    };

@Injectable({
    providedIn: 'root',
})
export class NxCloudApiService {
    private CONFIG = nxConfig;
    private kbInstantSearchFlag = nxConfig.featureFlags.kbInstantSearch;
    public currentAccount: Account; // Used by staffSWBypass decorator
    public swBypass = false;
    public swBypassTimeout: ReturnType<typeof setTimeout>;
    public customClient: CustomClientAPI;
    public licenseServerApiFactory: (
        licenseServer: string,
        cloudHost: () => string,
    ) => LicenseServerAPI;
    public cloudStorageApi: CloudStorageAPI;
    public cloudDbApi: CloudDbAPI;
    public docDbApi: DocDbAPI;
    public cloudChannelPartnersApi: ChannelPartnersApi;
    public targetInstance: string;

    constructor(
        private http: HttpClient,
        private cacheService: NxUriCacheService,
        private router: Router,
        // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
        // @ts-ignore: Used in service worker decorators (above)
        private nxSwCacheService: NxSwCacheService,
        private consoleService: NxConsoleService,
        private oauthService: OauthService,
        private cookieService: CookieService,
        @Inject(WINDOW) private window: Window,
        private injector: Injector,
    ) {
        DocHandler.runInInjectionContext = callback =>
            runInInjectionContext(this.injector, callback);
        // check the parameters before pushing this
        this.customClient = new CustomClientAPI(this.http, this.consoleService);
        this.licenseServerApiFactory = LicenseServerAPI.createApiFactory(
            this.http,
            this.#withFreshSession,
        );
        try {
            const _targetInstance =
                this.cookieService.get('cloud_instance') || environment.isLocal
                    ? this.CONFIG.cloudHost
                    : '';
            this.targetInstance =
                new URL(_targetInstance).hostname === this.window.location.hostname
                    ? ''
                    : _targetInstance;
        } catch (e) {
            this.targetInstance = '';
        }
        this.cloudStorageApi = CloudStorageAPI.createApiFactory(this.http, this.#withFreshSession)(
            this.targetInstance,
            () => '',
        );
        const refreshToken = defer(() =>
            this.getTokensFromCloud('session', 'refresh_token', 'code'),
        ).pipe(map(({ code }) => code));
        this.cloudDbApi = CloudDbAPI.createApiFactory(
            this.http,
            this.#withFreshSession,
            refreshToken,
        )(this.targetInstance, () => this.CONFIG.customization);
        this.docDbApi = DocDbAPI.createApiFactory(
            this.http,
            this.#withFreshSession,
            refreshToken,
        )(this.targetInstance, () => this.CONFIG.customization);

        this.cloudChannelPartnersApi = ChannelPartnersApi.createApiFactory(
            this.http,
            this.#withFreshSession,
            refreshToken,
        )(this.targetInstance);
    }

    getSubAPI(route: ConsoleSection) {
        switch (route) {
            case 'custom-clients':
                return this.customClient;
            default:
                return {
                    list: (...args) => new BehaviorSubject([]),
                    getManifest: () => new BehaviorSubject({ manifest: { contexts: {} } }),
                    retrieve: id => new BehaviorSubject({}),
                };
        }
    }

    cachedGet(url: string, opts: WithResponseType<'arraybuffer'>): Observable<ArrayBuffer>;
    cachedGet(url: string, opts: WithResponseType<'blob'>): Observable<Blob>;
    cachedGet(url: string, opts: WithResponseType<'text'>): Observable<string>;
    cachedGet<T>(url: string, opts?: WithOptionalJson): Observable<T>;
    cachedGet(url: string, opts?: RequestOpts): Observable<unknown> {
        const { responseType, ...other } = opts ?? {};
        let request: Observable<unknown>;
        if (responseType === 'arraybuffer') {
            request = this.http.get(url, { responseType, ...other });
        } else if (responseType === 'blob') {
            request = this.http.get(url, { responseType, ...other });
        } else if (responseType === 'text') {
            request = this.http.get(url, { responseType, ...other });
        } else {
            request = this.http.get(url, { responseType, ...other });
        }
        return request;
    }

    checkResponseHasError<_T extends any>(data: any) {
        // this is not a repetition
        if (data?.resultCode && data.resultCode !== responseOk) {
            return data;
        }
        return false;
    }

    @swClear('cloudSystemAPI', '/systems', true)
    disconnect(systemId: string) {
        // Use cloudDbApi once TempCredentials have been added to cloudDbApi
        return this.http
            .post<t.CloudResponse>(apiBase + '/systems/disconnect', {
                system_id: systemId,
            })
            .toPromise();
    }

    @swClear('cloudSystemAPI', '/systems', false)
    connect(systemName, email, password) {
        // Use cloudDbApi once TempCredentials have been added to cloudDbApi
        const accessToken = this.oauthService.cloudApiAccessToken;
        let headers = new HttpHeaders();
        if (accessToken) {
            headers = headers.set('Authorization', `Bearer ${accessToken}`);
        }
        return this.http
            .post<t.CloudResponse>(
                this.CONFIG.cloudHost + apiBase + '/systems/connect',
                {
                    name: systemName,
                    email,
                    password,
                },
                { headers },
            )
            .pipe(
                tap(() => {
                    if (accessToken) {
                        return this.oauthService.logoutTokens();
                    }
                }),
            );
    }

    verify(password) {
        return this.http
            .post(apiBase + '/account/verify', {
                password,
            })
            .toPromise();
    }

    update2fa(password: string, mfaCode: string, action: 'activate' | 'deactivate' | 'toggle') {
        return this.http
            .post<t.CloudResponse>(apiBase + '/account/security', { password, mfaCode, action })
            .toPromise();
    }

    deactivate2FaKey() {
        return this.http.delete<t.CloudResponse>(apiBase + '/account/security').toPromise();
    }

    get2FaKey() {
        return this.http.post<t.CloudResponse>(apiBase + '/2fa/verification', {}).toPromise();
    }

    get2FaBackupCode() {
        return this.http.post<t.TwoFactorBackupCodes[]>(apiBase + '/2fa/backup', {}).toPromise();
    }

    verify2FaKey(verificationCode, code) {
        const uri = `${apiBase}/2fa/verification?verification_code=${verificationCode}&code=${code}`;
        return this.http.get(uri).toPromise();
    }

    updateSessionWith2fa(verificationCode) {
        return this.http
            .post<t.CloudResponse>(apiBase + '/2fa/updateSession', {
                verification_code: verificationCode,
            })
            .toPromise();
    }

    toggle2faForSystem(systemId: string, mfaCode: string) {
        return this.http.post(apiBase + '/systems/toggle2fa', { systemId, mfaCode }).toPromise();
    }

    @memoizeAsyncPersistent
    getStaticLanding() {
        const httpOptions = {
            headers: new HttpHeaders({ 'Content-Type': 'application/text' }),
            responseType: 'text' as const,
        };
        return this.cachedGet('/' + this.CONFIG.viewsDir + 'static/landing.html', httpOptions);
    }

    @memoizeAsyncPersistent
    getStatic(url) {
        const httpOptions = {
            headers: new HttpHeaders({ 'Content-Type': 'application/text' }),
            responseType: 'text' as const,
        };
        return this.cachedGet(url, httpOptions);
    }

    @memoizeAsyncPersistent
    getCommonPasswords() {
        return this.cachedGet<{ [key: string]: number }>(
            '/static/scripts/commonPasswordsList.json',
        );
    }

    @staffSWBypass
    @memoizeAsyncLong
    getIntegrations() {
        return this.cachedGet<{ data: t.Integration[] }>(apiBase + '/cms/integrations');
    }

    @memoizeAsyncLong
    getIntegrationsCount() {
        return this.cachedGet<t.IntegrationCount>(apiBase + '/cms/integration_count');
    }

    @staffSWBypass
    @memoizeAsyncLong
    getIntegrationBy(id: number, status: string) {
        let uri = apiBase + '/cms/integration/' + id;
        uri += status ? '?' + status : '';

        return this.cachedGet<Array<t.Integration>>(uri);
    }

    @memoizeAsyncLong
    getIPVD() {
        return this.http.get<t.IPVDCameras>(apiBase + '/ipvd');
    }

    getCode(systemId: string) {
        return this.cloudDbApi.getCode(systemId);
    }

    @memoizeAsyncShort
    getSystemAuth(systemId: string) {
        return this.cloudDbApi.getAuth(systemId).pipe(
            filter(res => !!res),
            shareReplay({ bufferSize: 1, refCount: false, windowTime: 10 * 1000 }),
        );
    }

    @memoizeAsyncShort
    getSystemToken(systemId: string): Observable<{ access_token: string; refresh_token: string }> {
        // Todo: Using cloud portal to avoid auth issue with clouddb. Need to revert this once cloudDbApi.getToken is fixed.
        return this.http
            .post<{ access_token: string; refresh_token: string }>(
                `${apiBase}/systems/${systemId}/token`,
                {},
            )
            .pipe(shareReplay({ bufferSize: 1, refCount: false, windowTime: 10 * 1000 }));
        // return this.cloudDbApi.getToken(systemId);
    }

    @swClear('cloudSystemAPI', '/systems', true)
    merge(masterSystemId: string, slaveSystemId: string, password: string) {
        // TODO: Move to cloudDbApi once we add oauth handlers to cloudDbApi
        return this.http
            .post<t.CloudResponse>(`${apiBase}/systems/merge`, {
                master_system_id: masterSystemId,
                slave_system_id: slaveSystemId,
                password,
            })
            .toPromise();
    }

    notificationSend(userEmail: string, type: string, message: string) {
        return this.http
            .post(`${apiBase.replace('/api', '/notifications')}/send`, {
                user_email: userEmail,
                type,
                message,
            })
            .toPromise();
    }

    @staffSWBypass
    @memoizeAsyncPersistent
    getReadOnlyAPIs() {
        return this.cachedGet<{ data: t.ReadOnlyAPI[] }>(apiBase + '/cms/readonly_apis');
    }

    @staffSWBypass
    @memoizeAsyncPersistent
    getReadOnlyAPI(id: number) {
        return this.cachedGet<t.ReadOnlyAPIDetail>(apiBase + `/cms/readonly_apis/${id}`);
    }

    // not used, except in debug
    reloadIPVD() {
        return this.http.post(apiBase + '/ipvd', {});
    }

    registerUser(
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        code: string,
    ) {
        return this.http
            .post<t.RegisterUser>(apiBase + '/account/register', {
                email,
                password,
                first_name: firstName,
                last_name: lastName,
                code,
            })
            .toPromise();
    }

    reactivateUser(userEmail: string) {
        return this.http
            .post<t.CloudResponse>(apiBase + '/account/activate', { user_email: userEmail })
            .toPromise();
    }

    renameSystem(systemId: string, systemName: string) {
        return this.cloudDbApi.rename(systemId, systemName).toPromise();
    }

    sendMessage(
        type: string,
        asset: string,
        message: string,
        userName?: string,
        userEmail?: string,
    ) {
        return this.http
            .post<t.CloudResponse>(apiBase + '/feedback', {
                message,
                asset,
                type,
                userName,
                userEmail,
            })
            .toPromise();
    }

    @memoizeAsyncShort
    systems(systemId?: string) {
        return this.cloudDbApi.systems(systemId);
    }

    @memoizeAsyncLong
    users(systemId: string) {
        return this.cloudDbApi.getCloudUsers(systemId);
    }

    removeUser(systemId: string, userEmail: string, password?: string) {
        const body: any = {
            accountEmail: userEmail,
            accessRole: this.CONFIG.accessRoles.unshare,
            isEnabled: false,
        };
        if (environment.isLocal) {
            const url = `${this.CONFIG.cloudHost}/api/systems/${systemId}/users`;
            body.email = userEmail;
            body.password = password || '';
            return this.http.post(url, body);
        }

        return this.cloudDbApi.removeUser(systemId, userEmail);
    }

    authKey() {
        return this.http.post<t.AuthKey>(apiBase + '/account/authKey', {}).toPromise();
    }

    visitedKey(key: string) {
        return this.http
            .get<t.VisitedKey>(apiBase + '/utils/visitedKey/?key=' + encodeURIComponent(key))
            .toPromise();
    }

    checkCode(code: string) {
        return this.http
            .post<t.CloudResponse>(apiBase + '/account/checkCode', { code })
            .toPromise();
    }

    checkAuthCode(code: string) {
        return this.http.post<t.AuthCode>(apiBase + '/account/checkAuthCode', { code }).toPromise();
    }

    checkIfEmailExistsInCloud(email: string) {
        return this.http
            .post<t.CheckEmailExists>(apiBase + '/account/check', { email })
            .toPromise();
    }

    authenticate(
        email: string,
        password: string,
        clientId: string,
        redirectUrl: string,
        responseType: string,
        state?: string,
        scope?: string,
    ): Promise<t.AuthenticateResp> {
        const body: t.AuthorizeParams & { password: string } = {
            email,
            password,
            client_id: clientId,
            redirect_uri: redirectUrl,
            response_type: responseType,
        };
        if (state) {
            body.state = state;
        }
        if (scope) {
            body.scope = scope;
        }

        return this.http.post('/oauth/authenticate', body).toPromise();
    }

    verifyCode(verification_code: string, code: string) {
        const url = `${apiBase}/2fa/verification?verification_code=${verification_code}&code=${code}`;
        return this.http.get<any>(url);
    }

    verifyBackupCode(verification_code: string, code: string) {
        const url = `${apiBase}/2fa/backup?verification_code=${verification_code}&code=${code}`;
        return this.http.get<any>(url);
    }

    private logIdentifyUser = tap((account: Account) => {
        if (this.CONFIG.cloudMonitoring.isFullStoryActive && account.email) {
            const userInfo: { [propName: string]: string | number | boolean } = {
                email: account.email,
            };
            if (account.first_name) {
                userInfo.name = account.first_name;
                if (account.last_name) {
                    userInfo.name = `${account.first_name} ${account.last_name}`;
                }
            } else if (account.last_name) {
                userInfo.name = account.last_name;
            }
            FullStory.identify(account.email, userInfo);
        }
    });

    @swClear('apiFresh', '/account', true)
    login(email: string, password: string, remember: boolean) {
        // clearCache();
        return this.http
            .post<Account>(apiBase + '/account/login', {
                email,
                password,
                remember,
                timezone: (Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || '',
            })
            .pipe(this.logIdentifyUser)
            .toPromise();
    }

    @swClear('apiFresh', '/account', true)
    loginCode(code: string) {
        return this.http
            .post(apiBase + '/account/loginCode', { code })
            .pipe(
                tap((account: Account) => {
                    this.currentAccount = account;
                }),
                this.logIdentifyUser,
            )
            .toPromise();
    }

    @swClear('apiFresh', '/account', true)
    loginTokens(tokensInfo) {
        const options = {
            headers: {
                Authorization: `Bearer ${tokensInfo.access_token}`,
            },
        };
        return this.http
            .post(apiBase + '/account/loginTokens', tokensInfo, options)
            .pipe(this.logIdentifyUser)
            .toPromise();
    }

    @swClear('apiFresh', '/account', true)
    logout() {
        // clearCache();
        return this.http.post<t.CloudResponse>(apiBase + '/account/logout', {}).toPromise();
    }

    deleteCloudUser(password) {
        return this.http
            .post<t.CloudResponse>(apiBase + '/account/delete', { password })
            .toPromise();
    }

    fetchTos(): Observable<TosInfo> {
        return this.http.get<TosInfo>('/api/cms/agreement?type=tos');
    }

    private lastUpdateTime = 0;

    account(forceUpdate = false): Observable<Account> {
        const checkIfShouldUpdate = () => {
            const now = Date.now();
            if (forceUpdate || this.lastUpdateTime < now - 10 * 1000) {
                this.lastUpdateTime = now;
                return true;
            }
            return false;
        };
        return of(checkIfShouldUpdate()).pipe(switchMap(force => this.getAllAccountInfo(force)));
    }

    // @memoizeAsyncShort
    private getAccount(forceUpdate = false): Observable<CloudAccount> {
        let headers = new HttpHeaders();
        const params: { force?: true } = {};
        if (forceUpdate) {
            headers = headers.set('reset-cache', 'reset');
            params.force = true;
        }
        return this.http.get<CloudAccount>(apiBase + '/account', { headers, params }).pipe(
            map(account => {
                if (!account.isCloud) {
                    // Returned object is readonly sometimes for some reason
                    account = { ...account, isCloud: true };
                }
                return account;
            }, tap(this.logIdentifyUser)),
        );
    }

    @memoizeAsyncShort
    private getAllAccountInfo(forceUpdate = false): Observable<Account> {
        return this.getAccount(forceUpdate).pipe(
            switchMap(cloudInfo =>
                forkJoin([
                    of(cloudInfo),
                    cloudInfo?.email
                        ? this.cloudDbApi.getAccountSecurity()
                        : of({ account2faEnabled: false, totpExistsForAccount: false }),
                ]),
            ),
            map(([cloudInfo, security]) => {
                cloudInfo.sessionVerified = cloudInfo.sessionVerified || security.account2faEnabled;
                this.currentAccount = { ...cloudInfo, ...security };
                return this.currentAccount;
            }),
        );
    }

    checkFeatureNotice = <T>(noticeKey: string, firstViewCallback: () => T) =>
        this.customAccountPropertyFactory('featureNotices', {} as Record<string, boolean>).update(
            async value => {
                if (value[noticeKey]) {
                    return Promise.resolve(value);
                }

                await firstViewCallback();

                return { ...value, [noticeKey]: true };
            },
        );

    customAccountPropertyFactory<T>(property: string, initialValue: T): CustomAccountProperty<T>;
    customAccountPropertyFactory<T>(
        property: string,
        username: string,
        initialValue: T,
    ): CustomAccountProperty<T>;
    customAccountPropertyFactory<T>(
        property: string,
        usernameOrInitialValue: string | T,
        initialValue?: T,
    ): CustomAccountProperty<T> {
        const username =
            initialValue && usernameOrInitialValue ? (usernameOrInitialValue as string) : '';
        initialValue ||= usernameOrInitialValue as T;
        return CustomAccountProperty.getInstance(
            this.http,
            property,
            initialValue,
            username,
            this.targetInstance,
        );
    }

    /**
        @deprecated use customAccountPropertyFactory instead.
    */
    getCustomAccountProperty(property: string, username?: string) {
        const endpoint = `${apiBase}/custom-properties/${property}${
            username ? '/' + username : ''
        }`;
        return this.http.get<any>(endpoint);
    }

    /**
        @deprecated use customAccountPropertyFactory instead.
    */
    saveCustomAccountProperty(payload: any, property: string, username?: string) {
        const endpoint = `${apiBase}/custom-properties/${property}${
            username ? '/' + username : ''
        }`;
        return this.http.post<any>(endpoint, payload);
    }

    @memoizeAsyncPersistent
    getLanguages() {
        const uri = environment.isLocal
            ? '/static/languages.json'
            : `${this.window.location.origin}/${staticBase}/languages.json`;
        return this.cachedGet<t.ILanguages>(uri).toPromise();
    }

    @swClear('apiFresh', '/utils/language', true)
    changeLanguage(language: string) {
        return this.http
            .post(apiBase + '/utils/language/', {
                language,
            })
            .toPromise();
    }

    @memoizeAsyncPersistent
    getDownloads(): Promise<t.Downloads | null> {
        return this.cachedGet<t.Downloads | null>(apiBase + '/utils/downloads').toPromise();
    }

    @memoizeAsyncPersistent
    getDownloadsReleases(): Promise<DownloadReleases | null> {
        return this.cachedGet<t.DownloadReleases | null>(
            apiBase + '/utils/downloads-releases',
        ).toPromise();
    }

    @memoizeAsyncPersistent
    getDownloadsHistory(build: string | undefined): Promise<t.BuildHistory | t.Build> {
        return this.cachedGet<t.BuildHistory | t.Build>(
            apiBase + '/utils/downloads/' + (build || 'history'),
        ).toPromise();
    }

    accountPost(account: Account) {
        // strip unnecessary account info
        const accountInfo = {
            email: account.email,
            first_name: account.first_name,
            last_name: account.last_name,
            is_staff: account.is_staff,
            is_superuser: account.is_superuser || false,
            permissions: account.permissions,
        };
        return this.http.post<t.AccountEdit>(apiBase + '/account', accountInfo).toPromise();
    }

    changePassword(newPassword: string, oldPassword: string, mfaCode?: string) {
        return this.http
            .post<t.CloudResponse>(apiBase + '/account/changePassword', {
                new_password: newPassword,
                old_password: oldPassword,
                mfaCode,
            })
            .toPromise();
    }

    reactivate(userEmail: string) {
        return this.http
            .post<t.CloudResponse>(apiBase + '/account/activate', {
                user_email: userEmail,
            })
            .toPromise();
    }

    activate(code: string) {
        return this.http.post<t.CloudResponse>(apiBase + '/account/activate', {
            code,
        });
    }

    restorePasswordRequest(userEmail: string) {
        return this.http
            .post<t.CloudResponse>(apiBase + '/account/restorePassword', {
                user_email: userEmail,
            })
            .toPromise();
    }

    restorePassword(code: string, newPassword: string, mfaCode?: string, isBackup = false) {
        return this.http
            .post<t.CloudResponse>(apiBase + '/account/restorePassword', {
                code,
                new_password: newPassword,
                mfaCode,
                isBackup,
            })
            .toPromise();
    }

    reviewCookie() {
        return this.http.post<t.CloudResponse>(apiBase + '/account/reviewCookie', {}).toPromise();
    }

    acceptAgreement(reviewId: string) {
        return this.http
            .post(apiBase + '/cms/accept_agreement', {
                review_id: reviewId,
            })
            .toPromise();
    }

    acceptReview(reviewId: number) {
        return this.http
            .post(apiBase + '/cms/accept_review', {
                review_id: reviewId,
            })
            .toPromise()
            .then(response => {
                this.cacheService.clearData();
                return response;
            });
    }

    /* Ownership transfer */
    @memoizeAsyncShort
    getTransfers(): Observable<t.SystemTransferInfo[]> {
        return this.http.get<t.SystemTransferInfo[]>(`${apiBase}/transfer/`);
    }

    startTransfer(systemId: string, newOwnerEmail: string): Observable<t.SystemTransferInfo> {
        return this.http.post<t.SystemTransferInfo>(`${apiBase}/transfer/${systemId}/`, {
            newOwnerEmail,
        });
    }

    cancelTransfer(systemId: string): Observable<t.CloudResponse> {
        return this.http.delete<t.CloudResponse>(`${apiBase}/transfer/${systemId}/`);
    }

    respondToTransfer(
        systemId: string,
        action: 'accepted' | 'rejected',
    ): Observable<t.CloudResponse> {
        return this.http.put<t.CloudResponse>(`${apiBase}/transfer/${systemId}/`, { action });
    }

    // Cloud Storage

    enableCloudStorage(systemId: string) {
        return this.http
            .post<t.CloudStorage>(apiBase + '/storage/create', {
                systemId,
            })
            .toPromise();
    }

    /**
     * Expected response:
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
    @memoizeAsyncShort
    getCloudStorageUsage(systemId: string): Promise<any> {
        return this.http
            .get<t.CloudStorageUsage>(apiBase + '/storage/usageStats', {
                params: {
                    systemId,
                },
            })
            .toPromise();
    }

    @staffSWBypass
    @memoizeAsyncPersistent
    getDocumentation(
        name,
        type: t.DOC_TYPES,
        assetIdOrSearchObject?: string | number | { query: string | number; page?: number },
        state?: string,
        assetVersion?: number,
    ) {
        let endpoint = name ? `/${type}/${name}` : '';
        let params = new HttpParams();
        if (
            typeof assetIdOrSearchObject === 'string' ||
            typeof assetIdOrSearchObject === 'number'
        ) {
            const urlAppend = assetIdOrSearchObject ? `/${assetIdOrSearchObject}` : '';
            if (type === t.DOC_TYPES.knowledgebase) {
                endpoint = urlAppend;
            } else {
                endpoint += urlAppend;
            }
        } else if (assetIdOrSearchObject?.query) {
            params = params.set('filter', `${assetIdOrSearchObject.query}`);
            params = params.set(
                'page',
                assetIdOrSearchObject.page ? assetIdOrSearchObject.page.toString() : '1',
            );
        }
        if (state) {
            params = params.set('state', state.replace('pending', 'review'));
        }
        if (assetVersion) {
            params = params.set('version', assetVersion.toString());
        }
        const route = `${apiBase}/cms/documentation${endpoint}?${params.toString()}`;
        this.cacheService.addToCache(route);
        return this.cachedGet<any>(route).pipe(
            catchError(error => {
                if (error.status === 404) {
                    this.#show404();
                    return EMPTY;
                } else {
                    return of(error);
                }
            }),
        );
    }

    @staffSWBypass
    documentationInstantSearch(name, query, options?: Partial<t.InstantSearchOptions>) {
        if (!this.kbInstantSearchFlag) {
            return throwError(new Error('Instant search feature not enabled'));
        }
        const params = mapValuesToStrings({ query, ...options });
        const urlSearchParams = new URLSearchParams(params).toString();
        const route = `${apiBase}/cms/documentation/kb/${name}/search?${urlSearchParams}`;
        this.cacheService.addToCache(route);
        return this.http.get<any>(route, { headers: { 'cache-request': 'true' } });
    }

    @memoizeAsyncPersistent
    getDocAsset(assetId) {
        const route = `${apiBase}/cms/documentation/${assetId}`;
        return this.cachedGet<t.DocAsset>(route).pipe(
            catchError(_ =>
                of(<t.DocAsset>{ blocks: [], id: null, shortDescription: null, title: null }),
            ),
        );
    }

    findArticleKB(assetId) {
        return this.http.get<any>(`${apiBase}/cms/documentation/find_kb/${assetId}`).pipe(
            catchError(error => {
                if (error.status === 404) {
                    if (error.error.errorText === 'Kb not found') {
                        this.router
                            .navigate(['/'], { skipLocationChange: true })
                            .then(_ => this.router.navigate([`/docs/content/${assetId}`]));
                    } else {
                        this.#show404();
                    }
                    return EMPTY;
                } else {
                    return of(error);
                }
            }),
        );
    }

    getArticle(article: string) {
        return this.http.get<any>(`${apiBase}/cms/article/${article}/?`);
    }

    #show404 = (): void => {
        this.router
            .navigate([redirect.page404], {
                replaceUrl: true,
            })
            .catch(error => {
                console.error(error);
            });
    };

    @memoizeAsyncShort
    getTimeSinceLogin() {
        return this.http.get<any>(apiBase + '/account/timeSincePassword');
    }

    @memoizeAsyncShort
    getTokensFromCloud(
        code: string,
        grant_type: 'authorization_code' | 'refresh_token' = 'authorization_code',
        response_type: 'token' | 'code' = null,
    ) {
        response_type ||= grant_type === 'refresh_token' ? 'code' : 'token';
        const params = {
            [grant_type.replace('authorization_', '')]: code,
            grant_type,
            response_type,
        };
        return this.http.get<Record<string, string>>(`${this.CONFIG.cloudHost}/oauth/token/`, {
            params,
        });
    }

    @memoizeAsyncLong
    refreshAccessTokens() {
        return this.http
            .post<Record<string, string>>(
                `${this.CONFIG.cloudHost}${apiBase}/account/refreshAccessToken`,
                {},
            )
            .pipe(map(({ access_token }) => ({ accessToken: access_token })));
    }

    /**
     * This is used to ensure that request made to cloud services external to cloud portal have a fresh session to be used for request.
     *
     * The accessToken along with a getFreshAccessToken method it passed as an input the observableInputFactory to be used to authenticate the request and also to be able to retry with a fresh accessToken.
     *
     * @param minSessionSeconds : number
     * @returns wraps: (observableInputFactory: ({ accessToken, getFreshAccessToken }) => ObservableInput<unknown>)
     */
    #withFreshSession: t.WithFreshSession = TokenSessionManager.getInstance(
        '/api/account/refreshAccessToken',
    );

    @memoizeAsyncShort
    getAccessToken(): Observable<string> {
        return this.#withFreshSession()(({ accessToken }) => of(accessToken));
    }

    @memoizeAsyncShort
    getTokenInfo(token: string) {
        return this.http.get(this.CONFIG.cloudHost + '/oauth/introspect/', { params: { token } });
    }

    logoutTokens(accessToken: string, refreshToken: string) {
        return this.oauthService.logoutTokens(accessToken, refreshToken);
    }

    getAssets = (maxAge = 0, params) =>
        this.http.get<{ last: string; data: t.ExplorerNode[] }>(`${apiBase}/assets`, {
            params: { maxAge, ...params },
        });

    testEmailNotification(emailNotificationPayload: t.EmailNotification) {
        return this.http.post(
            apiBase + '/notifications/email_notification',
            emailNotificationPayload,
        );
    }

    @memoizeAsyncShort
    checkLicenseServer(systemId: string, licenseServer: string, cloudHost: string) {
        const endpoint = `${apiBase}/systems/${systemId}/licenseServer`;
        const response = licenseServer
            ? this.http.post<t.LicenseServerInfo>(endpoint, { licenseServer, cloudHost })
            : this.http.get<t.LicenseServerInfo>(endpoint);
        return response.pipe(
            catchError(() =>
                Promise.resolve({
                    systemId,
                    licenseServer: this.CONFIG.licenseServer,
                    cloudHost: this.CONFIG.cloudHost,
                    cacheUpdated: false,
                }),
            ),
        );
    }
}
