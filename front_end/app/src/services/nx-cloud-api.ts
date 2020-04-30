import { Injectable }               from '@angular/core';
import { HttpClient }               from '@angular/common/http';
import { NxConfigService, IConfig } from './nx-config';
import { Account }                  from './account.service';
import { NxSystemWithUserInfo }     from './systems.service';
import * as t                       from './nx-cloud-api.types';

@Injectable({
    providedIn: 'root'
})
export class NxCloudApiService {
    private CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        private http: HttpClient
    ) {
        this.CONFIG = configService.getConfig();
    }

    checkResponseHasError<T extends any>(data: T) {
        if (data && data.resultCode && data.resultCode !== this.CONFIG.responseOk) {
            return data;
        }
        return false;
    }

    disconnect(systemId: string, password: string) {
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/systems/disconnect', {
            system_id: systemId,
            password
        });
    }

    getCommonPasswords() {
        return this.http.get<string[]>('/static/scripts/commonPasswordsList.json');
    }

    getIntegrations() {
        return this.http.get(this.CONFIG.apiBase + '/integrations');
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
        return this.http.post<t.NormalResponse>(`${this.CONFIG.apiBase}/systems/merge`, {
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
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/account/activate',
            { user_email: userEmail }).toPromise();
    }

    renameSystem(systemId: string, systemName: string) {
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/systems/' + systemId + '/name', {
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
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/feedback', {
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
        return this.http.post(this.CONFIG.apiBase + '/account/authKey', {}).toPromise();
    }

    visitedKey(key: string) {
        return this.http.get(this.CONFIG.apiBase + '/utils/visitedKey/?key=' + encodeURIComponent(key)).toPromise();
    }

    checkCode(code: string) {
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/account/checkCode', { code }).toPromise();
    }

    checkAuthCode(code: string) {
        return this.http.post(this.CONFIG.apiBase + '/account/checkAuthCode', { code }).toPromise();
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
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/account/logout', {}).toPromise();
    }

    deleteCloudUser(password) {
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/account/delete', { password }).toPromise();
    }

    account() {
        return this.http.get<Account>(this.CONFIG.apiBase + '/account');
    }

    getLanguages() {
        return this.http.get<t.ILanguages>('/static/languages.json').toPromise();
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
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/account/changePassword', {
            new_password : newPassword,
            old_password : oldPassword
        }).toPromise();
    }

    reactivate(userEmail: string) {
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/account/activate', {
            user_email: userEmail
        }).toPromise();
    }

    activate(code: string) {
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/account/activate', {
            code
        }).toPromise();
    }

    restorePasswordRequest(userEmail: string) {
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/account/restorePassword', {
            user_email: userEmail
        }).toPromise();
    }

    restorePassword(code: string, newPassword: string) {
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/account/restorePassword', {
            code,
            new_password: newPassword
        }).toPromise();
    }

    acceptAgreement(reviewId: string) {
        return this.http.post(this.CONFIG.apiBase + '/accept_agreement', {
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
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/storage/delete', {
            systemId,
            password
        }).toPromise();
    }

    moveCloudStorage(sourceSystemId: string, destinationSystemId: string) {
        return this.http.post<t.NormalResponse>(this.CONFIG.apiBase + '/storage/move', {
            sourceSystemId,
            destinationSystemId
        }).toPromise();
    }

    getCloudStorageUsage(systemId: string) {
        // return Promise.resolve({
        //     enabled           : true,
        //     cloudCapacity     : 53687091200,
        //     currentRecordings : 7457136000, // ms, rounded to the hour
        //     whenFullyUsed     : 1209600000, // ms, rounded to the hour
        //     amountUsed        : 17424682320, // bytes rounded to 0.1 Gb, percent calculated and rounded to 1%
        //     archiveFrom       : 11, // number of cameras represented by integer
        //     recordingBitrate  : 1500000, // bps rounded to 0.1 Mbps
        //     delayFromLive     : 1200000 // ms, rounded to 0.1s}
        // });

        return this.http.get<t.CloudStorageUsage>(this.CONFIG.apiBase + '/storage/usageStats', {
            params: {
                systemId
            }
        }).toPromise();
    }
}
