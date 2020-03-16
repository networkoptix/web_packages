import { Injectable }               from '@angular/core';
import { HttpClient }               from '@angular/common/http';
import { Observable }               from 'rxjs';
import { NxConfigService, IConfig } from './nx-config';
import { Account }                  from './account.service';

@Injectable({
    providedIn: 'root'
})
export class NxCloudApiService {
    CONFIG: IConfig;

    constructor(configService: NxConfigService,
                private http: HttpClient) {
        this.CONFIG = configService.getConfig();
    }

    checkResponseHasError(data: any) {
        if (data && data.resultCode && data.resultCode !== this.CONFIG.responseOk) {
            return data;
        }
        return false;
    }

    disconnect(systemId: string, password: string) {
        return this.http.post(this.CONFIG.apiBase + '/systems/disconnect', {
            system_id: systemId,
            password
        });
    }

    getCommonPasswords(): Observable<any> {
        return this.http.get('/static/scripts/commonPasswordsList.json');
    }

    getIntegrations(): Observable<any> {
        return this.http.get(this.CONFIG.apiBase + '/integrations');
    }

    getIntegrationBy(id: number, status: string): Observable<any> {
        let uri = this.CONFIG.apiBase + '/integration/' + id;
        uri += (status) ? '?' + status : '';

        return this.http.get(uri);
    }

    getIPVD(): Observable<any> {
        return this.http.get(this.CONFIG.apiBase + '/ipvd');
    }

    getSystemAuth(systemId: string): Observable<any> {
        return this.http.get(`${this.CONFIG.apiBase}/systems/${systemId}/auth`);
    }

    merge(masterSystemId: string, slaveSystemId: string, password: string): Promise<any> {
        return this.http.post(`${this.CONFIG.apiBase}/systems/merge`, {
            master_system_id: masterSystemId,
            slave_system_id : slaveSystemId,
            password
        }).toPromise();
    }

    notificationSend(userEmail: string, type: string, message: string): Promise<any> {
        return this.http.post(`${this.CONFIG.apiBase.replace('/api', '/notifications')}/send`, {
            user_email: userEmail,
            type,
            message
        }).toPromise();
    }

    reloadIPVD(): Observable<any> {
        return this.http.post(this.CONFIG.apiBase + '/ipvd', {});
    }

    registerUser(
        email: string,
        password: string,
        firstName: string,
        lastName: string,
        subscribe: string,
        code: string
    ): Promise<any> {
        return this.http
            .post(this.CONFIG.apiBase + '/account/register',
                {
                    email,
                    password,
                    first_name: firstName,
                    last_name : lastName,
                    subscribe,
                    code
                })
            .toPromise();
    }

    reactivateUser(userEmail: string): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/activate',
            { user_email: userEmail }).toPromise();
    }

    renameSystem(systemId: string, systemName: string): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/systems/' + systemId + '/name', {
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
    ): Observable<any> {
        return this.http.post(this.CONFIG.apiBase + '/feedback', {
            message, asset, type, userName, userEmail
        });
    }

    systems(systemId?: string): Observable<any> {
        if (systemId) {
            return this.http.get(this.CONFIG.apiBase + '/systems/' + systemId);
        }
        return this.http.get(this.CONFIG.apiBase + '/systems');
    }

    users(systemId: string): Observable<any> {
        return this.http.get(`${this.CONFIG.apiBase}/systems/${systemId}/users`);
    }

    unshare(systemId: string, userEmail: string): Observable<any> {
        return this.http.post(this.CONFIG.apiBase + '/systems/' + systemId + '/users', {
            user_email: userEmail,
            role      : this.CONFIG.accessRoles.unshare
        });
    }

    authKey(): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/authKey', {}).toPromise();
    }

    visitedKey(key: string): Promise<any> {
        return this.http.get(this.CONFIG.apiBase + '/utils/visitedKey/?key=' + encodeURIComponent(key)).toPromise();
    }

    checkCode(code: string): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/checkCode', { code }).toPromise();
    }

    checkAuthCode(code: string): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/checkAuthCode', { code }).toPromise();
    }

    login(email: string, password: string, remember: boolean): Promise<any> {
        // clearCache();
        return this.http.post(this.CONFIG.apiBase + '/account/login', {
            email,
            password,
            remember,
            timezone: (Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || ''
        }).toPromise();
    }

    logout(): Promise<any> {
        // clearCache();
        return this.http.post(this.CONFIG.apiBase + '/account/logout', {}).toPromise();
    }

    account() {
        return this.http.get(this.CONFIG.apiBase + '/account');
    }

    getLanguages(): Promise<any> {
        return this.http.get('/static/languages.json').toPromise();
    }

    changeLanguage(language: string): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/utils/language/', {
            language
        }).toPromise();
    }

    getDownloads(): Promise<any> {
        return this.http.get(this.CONFIG.apiBase + '/utils/downloads').toPromise();
    }

    getDownloadsHistory(build: string): Promise<any> {
        return this.http.get(this.CONFIG.apiBase + '/utils/downloads/' + (build || 'history')).toPromise();
    }

    accountPost(account: Account): Promise<any> {
        // strip unnecessary account info
        const accountInfo = {
            email       : account.email,
            first_name  : account.first_name,
            last_name   : account.last_name,
            is_staff    : account.is_staff,
            is_superuser: account.is_superuser || false,
            language    : account.language,
            permissions : account.permissions
        };
        return this.http.post(this.CONFIG.apiBase + '/account', accountInfo).toPromise();
    }

    changePassword(newPassword: string, oldPassword: string): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/changePassword', {
            new_password: newPassword,
            old_password: oldPassword
        }).toPromise();
    }

    reactivate(userEmail: string): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/activate', {
            user_email: userEmail
        }).toPromise();
    }

    activate(code: string): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/activate', {
            code
        }).toPromise();
    }

    restorePasswordRequest(userEmail: string): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/restorePassword', {
            user_email: userEmail
        }).toPromise();
    }

    restorePassword(code: string, newPassword: string): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/restorePassword', {
            code,
            new_password: newPassword
        }).toPromise();
    }

    acceptAgreement(reviewId: string): Promise<any> {
        return this.http.post(this.CONFIG.apiBase + '/accept_agreement', {
            review_id: reviewId
        }).toPromise();
    }

    // Cloud Storage

    enableCloudStorage(systemId: string): Promise<any> {
        // TODO: don't forget to remove this and uncomment request to cloud storage end point
        const success = prompt('Add any message to mock success');
        return success ? Promise.resolve() : Promise.reject();
        // return this.http.post(this.CONFIG.apiBase + '/storage/create', {
        //     systemId
        // }).toPromise();
    }

    deleteCloudStorage(systemId: string, password: string): Promise<any> {
        // TODO: don't forget to remove this and uncomment request to cloud storage end point
        const success = prompt('Add any message to mock success');
        return success ? Promise.resolve() : Promise.reject(new Error('wrongPassword'));
        // return this.http.post(this.CONFIG.apiBase + '/storage/delete', {
        //     systemId,
        //     password
        // }).toPromise();
    }

    moveCloudStorage(sourceSystemId: string, destinationSystemId: string): Promise<any> {
        // TODO: don't forget to remove this and uncomment request to cloud storage end point
        const success = prompt('Add any message to mock success');
        return success ? Promise.resolve() : Promise.reject();
        // return this.http.post(this.CONFIG.apiBase + '/storage/move', {
        //     sourceSystemId,
        //     destinationSystemId
        // }).toPromise();
    }
}
