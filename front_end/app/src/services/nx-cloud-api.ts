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

    reloadIPVD(): Observable<any> {
        return this.http.post(this.CONFIG.apiBase + '/ipvd', {});
    }

    registerUser(email, password, firstName, lastName, subscribe, code): Observable<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/register',
                { email, password, first_name : firstName, last_name : lastName, subscribe, code });
    }

    activateUser(code): Observable<any> {
        return this.http.post(this.CONFIG.apiBase + '/account/activate',
                { code });
    }

    reactivateUser(userEmail) {
        return this.http.post(this.CONFIG.apiBase + '/account/activate',
                { user_email: userEmail });
    }
}
