import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxSystemGroupsService {
    constructor(
        public http: HttpClient,
    ) {
    }

    public loadGroups(): Observable<unknown> {
        return this.http.get('/api/custom-properties/systemGroup');
    }

    public exportBase64(): Promise<''> {
        // stub
        return Promise.resolve('');
    }

    public importBase64(base64string: string): Promise<void> {
        // stub
        return Promise.resolve();
    }
}
