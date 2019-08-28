import { Injectable }        from '@angular/core';
import { HttpClient }        from '@angular/common/http';
import { Observable }        from 'rxjs';
import { NxCloudApiService } from '../../services/nx-cloud-api';

@Injectable({
    providedIn: 'root'
})
export class NxActivateService {

    constructor(private http: HttpClient,
                private api: NxCloudApiService) {
    }

    activate(code): Promise<any> {
        return this.api
                   .activateUser(code)
                   .toPromise();
    }

    reactivate(userEmail): Promise<any> {
        return this.api
                   .reactivateUser(userEmail)
                   .toPromise();
    }
}
