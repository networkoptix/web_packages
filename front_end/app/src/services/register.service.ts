import { Injectable }      from '@angular/core';
import { HttpClient }      from '@angular/common/http';
import { Observable }      from 'rxjs';
import { NxConfigService } from './nx-config';

@Injectable({
    providedIn: 'root'
})
export class NxRegisterService {
    CONFIG: any;

    constructor(private http: HttpClient,
                private config: NxConfigService) {
        this.CONFIG = config.getConfig();
    }

    register(email, password, firstName, lastName, subscribe, code): Observable<any> {
        return this.http.post(this.CONFIG.apiBase + '/ipvd',
                {email, password, firstName, lastName, subscribe, code});
    }
}
