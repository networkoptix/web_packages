import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class NxSystemGroupsService {
    constructor(
        public http: HttpClient,
    ) {
    }

    public loadGroups() {
        return this.http.get('/api/custom-properties/systemGroup');
    }

    public exportBase64() {
        // stub
        return Promise.resolve('');
    }

    public importBase64(base64string) {
        // stub
        return Promise.resolve();
    }
}
