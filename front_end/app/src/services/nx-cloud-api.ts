import { Injectable }      from '@angular/core';
import { HttpClient }      from '@angular/common/http';
import { Observable }      from 'rxjs';
import { NxConfigService } from './nx-config';

@Injectable({
    providedIn: 'root'
})
export class NxCloudApiService {
    CONFIG: any;

    constructor(private http: HttpClient,
                private config: NxConfigService) {
        this.CONFIG = config.getConfig();
    }

    checkResponseHasError(data: any) {
        if (data && data.resultCode && data.resultCode !== this.CONFIG.responseOk) {
            return data;
        }
        return false;
    }

    getCommonPasswords(): Observable<any> {
        return this.http.get('/static/scripts/commonPasswordsList.json');
    }

    getIntegrations(): Observable<any> {
        return this.http.get(this.CONFIG.apiBase + '/integrations');
    }

    getIntegrationBy(id: number, status: string): Observable<any> {
        let uri = this.CONFIG.apiBase + '/integration/' + id;
        uri += (status) ? '?' + status : '' ;

        return this.http.get(uri);
    }

    getIPVD(): Observable<any> {
        return this.http.get(this.CONFIG.apiBase + '/ipvd');
    }

    getSystemAuth(systemId) {
        return this.http.get(`${this.CONFIG.apiBase}/systems/${systemId}/auth`);
    }

    reloadIPVD(): Observable<any> {
        return this.http.post(this.CONFIG.apiBase + '/ipvd', {});
    }

    registerUser(email, password, firstName, lastName, subscribe, code): Observable<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/register',
                { email, password, first_name : firstName, last_name : lastName, subscribe, code });
    }

    systems (systemId?: string): Observable<any> {
        if (systemId) {
            return this.http.get(this.CONFIG.apiBase + '/systems/' + systemId);
        }
        return this.http.get(this.CONFIG.apiBase + '/systems');
    }

    users(systemId) {
        return this.http.get(`${this.CONFIG.apiBase}/systems/${systemId}/users`);
    }

    unshare(systemId, userEmail) {
        return this.http.post(this.CONFIG.apiBase + '/systems/' + systemId + '/users', {
            user_email: userEmail,
            role: this.CONFIG.accessRoles.unshare
        });
    }

    authKey() {
        return this.http.post(this.CONFIG.apiBase + '/account/authKey', {}).toPromise();
    }

    visitedKey(key) {
        return this.http.get(this.CONFIG.apiBase + '/utils/visitedKey/?key=' + encodeURIComponent(key)).toPromise();
    }

    checkCode(code) {
        return this.http.post(this.CONFIG.apiBase + '/account/checkCode', { code }).toPromise();
    }

    login(email, password, remember) {
        // clearCache();
        return this.http.post(this.CONFIG.apiBase + '/account/login', {
            email,
            password,
            remember,
            timezone: Intl && Intl.DateTimeFormat().resolvedOptions().timeZone || ''
        }).toPromise();
    }

    logout() {
        // clearCache();
        return this.http.post(this.CONFIG.apiBase + '/account/logout', {}).toPromise();
    }

    account() {
        return this.http.get(this.CONFIG.apiBase + '/account').toPromise();
    }

    getLanguages() {
        return this.http.get('/static/languages.json').toPromise();
    }

    changeLanguage(language) {
        return this.http.post(this.CONFIG.apiBase + '/utils/language/', {
            language
        }).toPromise();
    }
}
