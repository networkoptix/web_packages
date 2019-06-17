import { Injectable }        from '@angular/core';
import { HttpClient }        from '@angular/common/http';
import { Observable }        from 'rxjs';
import { NxCloudApiService } from './nx-cloud-api';

@Injectable({
    providedIn: 'root'
})
export class NxRegisterService {

    constructor(private http: HttpClient,
                private api: NxCloudApiService) {
    }

    register(email, password, firstName, lastName, subscribe, code): Promise<any> {
        return this.api
                   .registerUser(email, password, firstName, lastName, subscribe, code)
                   .toPromise();
    }
}
