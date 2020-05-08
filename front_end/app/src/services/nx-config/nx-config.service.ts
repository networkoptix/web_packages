import { Injectable }        from '@angular/core';
import { IConfig }           from './config-types';
import { nxConfig }          from './config';
import { NxCloudApiService } from '../nx-cloud-api';
import { HttpClient }        from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class NxConfigService {
    config: IConfig;

    constructor(
        private http: HttpClient
    ) {
        // These properties will be injected on config *******************
        // viewsDir: 'static/views/', //'static/lang_' + lang + '/views/';
        // previewPath: '',
        // viewsDirCommon: 'static/web_common/views/',
        // ***************************************************************

        this.config = nxConfig;
    }

    getSettings() {
        return this.http.get('/api/utils/settings').toPromise();
    }

    getConfig() {
        return this.config;
    }
}
