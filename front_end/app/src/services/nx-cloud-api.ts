import { Injectable }               from '@angular/core';
import { HttpClient, HttpHeaders }  from '@angular/common/http';

import { NxConfigService, IConfig } from './nx-config';
import { Account }                  from './account.service';
import { NxSystemWithUserInfo }     from './systems.service';
import * as t                       from './nx-cloud-api.types';
import { NxUriCacheService }        from './uri-cache.service';

@Injectable({
    providedIn: 'root'
})
export class NxCloudApiService {
    private CONFIG: IConfig;

    constructor(
        private configService: NxConfigService,
        private http: HttpClient,
        private cacheService: NxUriCacheService
    ) {
        this.CONFIG = configService.getConfig();
    }

    getLanguage() {
        return this.http.get('/api/utils/language');
    }

    checkResponseHasError<T extends any>(data: any) {
        // this is not a repetition
        if (data?.resultCode && data.resultCode !== this.CONFIG.responseOk) {
            return data;
        }
        return false;
    }

    disconnect(systemId: string, password: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/systems/disconnect', {
            system_id: systemId,
            password
        });
    }

    connect(systemName, email, password) {
        return this.http.post<t.CloudResponse>(this.configService.cloudHost + this.CONFIG.apiBase + '/systems/connect', {
            name     : systemName,
            email    : email,
            password : password
        }).toPromise();
    }

    getStaticLanding() {
        const httpOptions = {
            headers      : new HttpHeaders({ 'Content-Type': 'application/text' }),
            responseType : 'text' as 'text'
        };
        return this.http.get('/' + this.CONFIG.viewsDir + 'static/landing.html', httpOptions);
    }

    getStatic(url) {
        const httpOptions = {
            headers      : new HttpHeaders({ 'Content-Type': 'application/text' }),
            responseType : 'text' as 'text'
        };
        return this.http.get(url, httpOptions);
    }

    getCommonPasswords() {
        return this.http.get<string[]>('/static/scripts/commonPasswordsList.json');
    }

    getIntegrations() {
        return this.http.get<t.Integration>(this.CONFIG.apiBase + '/integrations');
    }

    getIntegrationBy(id: number, status: string) {
        let uri = this.CONFIG.apiBase + '/integration/' + id;
        uri += (status) ? '?' + status : '';

        return this.http.get<Array<t.Integration>>(uri);
    }

    getIPVD() {
        return this.http.get<t.IPVDCameras>(this.CONFIG.apiBase + '/ipvd');
    }

    getSystemAuth(systemId: string) {
        return this.http.get<t.SystemAuth>(`${this.CONFIG.apiBase}/systems/${systemId}/auth`);
    }

    merge(masterSystemId: string, slaveSystemId: string, password: string) {
        return this.http.post<t.CloudResponse>(`${this.CONFIG.apiBase}/systems/merge`, {
            master_system_id : masterSystemId,
            slave_system_id  : slaveSystemId,
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

    // not used, except in debug
    reloadIPVD() {
        return this.http.post(this.CONFIG.apiBase + '/ipvd', {});
    }

    registerUser(
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        subscribe: string,
        code: string
    ) {
        return this.http
            .post<t.RegisterUser>(this.CONFIG.apiBase + '/account/register',
                {
                    email,
                    password,
                    first_name : firstName,
                    last_name  : lastName,
                    subscribe,
                    code
                })
            .toPromise();
    }

    reactivateUser(userEmail: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/activate',
            { user_email: userEmail }).toPromise();
    }

    renameSystem(systemId: string, systemName: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/systems/' + systemId + '/name', {
            name: systemName
        }).toPromise().then((result) => {
            this.systems('clearCache');
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
            return this.http.get<NxSystemWithUserInfo[]>(this.CONFIG.apiBase + '/systems/' + systemId);
        }
        return this.http.get<NxSystemWithUserInfo[]>(this.CONFIG.apiBase + '/systems');
    }

    users(systemId: string) {
        return this.http.get<t.CloudUsers>(`${this.CONFIG.apiBase}/systems/${systemId}/users`);
    }

    unshare(systemId: string, userEmail: string) {
        return this.http.post(this.CONFIG.apiBase + '/systems/' + systemId + '/users', {
            user_email : userEmail,
            role       : this.CONFIG.accessRoles.unshare
        });
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

    login(email: string, password: string, remember: boolean) {
        // clearCache();
        return this.http.post<Account>(this.CONFIG.apiBase + '/account/login', {
            email,
            password,
            remember,
            timezone: (Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || ''
        }).toPromise();
    }

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
            headers = headers.set('reset-cache', 'true');
        }
        return this.http.get<Account>(endpoint, { headers });
    }

    getLanguages() {
        const endpoint = '/static/languages.json';
        this.cacheService.addToCache(endpoint);
        return this.http.get<t.ILanguages>(endpoint).toPromise();
    }

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
            email        : account.email,
            first_name   : account.first_name,
            last_name    : account.last_name,
            is_staff     : account.is_staff,
            is_superuser : account.is_superuser || false,
            language     : account.language,
            permissions  : account.permissions
        };
        return this.http.post<t.AccountEdit>(this.CONFIG.apiBase + '/account', accountInfo).toPromise();
    }

    changePassword(newPassword: string, oldPassword: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/changePassword', {
            new_password : newPassword,
            old_password : oldPassword
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

    restorePassword(code: string, newPassword: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/account/restorePassword', {
            code,
            new_password: newPassword
        }).toPromise();
    }

    acceptAgreement(reviewId: string) {
        return this.http.post(this.CONFIG.apiBase + '/accept_agreement', {
            review_id: reviewId
        }).toPromise();
    }

    acceptIntegration(reviewId: number) {
        return this.http.post(this.CONFIG.apiBase + '/accept_review', {
            review_id: reviewId
        }).toPromise();
    }

    // Cloud Storage

    enableCloudStorage(systemId: string) {
        return this.http.post<t.CloudStorage>(this.CONFIG.apiBase + '/storage/create', {
            systemId
        }).toPromise();
    }

    deleteCloudStorage(systemId: string, password: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/storage/delete', {
            systemId,
            password
        }).toPromise();
    }

    moveCloudStorage(sourceSystemId: string, destinationSystemId: string) {
        return this.http.post<t.CloudResponse>(this.CONFIG.apiBase + '/storage/move', {
            sourceSystemId,
            destinationSystemId
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

    getDocumentation(assetIdOrSearchObject?: string | number | {query: string | number, page?: number, tags?: string | number}) {
        let endpoint = '';
        if (typeof assetIdOrSearchObject === 'string' || typeof assetIdOrSearchObject === 'number') {
            endpoint = `/${assetIdOrSearchObject}`;
        } else if (assetIdOrSearchObject?.query || assetIdOrSearchObject?.tags) {
            endpoint = `?filter=${assetIdOrSearchObject.query}&tags=${assetIdOrSearchObject.tags}&page=${assetIdOrSearchObject.page || 1}`;
        }
        const route = `${this.CONFIG.apiBase}/documentation${endpoint}`;
        this.cacheService.addToCache(route);
        return this.http.get<any>(route);
    }
}
