import { Injectable }        from '@angular/core';
import { IConfig }           from './config-types';
import { nxConfig }          from './config';
import { HttpClient }        from '@angular/common/http';
import { environment } from '../../../environments/environment';

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
        // ***************************************************************

        this.config = nxConfig;
        this.config.isLocal = environment.isLocal;
    }

    getSettings() {
        return NxConfigService.isLocal
            ? Promise.resolve({})
            : this.http.get('/api/utils/settings').toPromise();
    }

    getConfig() {
        return this.config;
    }

    static get isLocal() {
        return nxConfig.isLocal;
    }

    static resolveLocalOrCloud = <Local, Cloud>(local: Local, cloud: Cloud) => {
        return NxConfigService.isLocal ? local : cloud;
    }

    public resolveLocalOrCloud = NxConfigService.resolveLocalOrCloud
}
