import { Injectable }        from '@angular/core';
import { HttpClient }        from '@angular/common/http';

import { IConfig }           from './config-types';
import { nxConfig }          from './config';
import { environment }       from '@environments/environment';

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

    get cloudHost() {
        return this.config.cloudHost;
    }

    getSettings() {
        const url = environment.isLocal ? '/static/customization/webadmin_config.json' : '/api/utils/settings';
        return this.http.get(url).toPromise();
    }

    getConfig() {
        return this.config;
    }

    updateConfig(data) {
        this.config = {...this.config, ...data};
    }

    static get isLocal() {
        return nxConfig.isLocal;
    }

    static resolveLocalOrCloud = <Local, Cloud>(local: Local, cloud: Cloud) => {
        return NxConfigService.isLocal ? local : cloud;
    }

    public resolveLocalOrCloud = NxConfigService.resolveLocalOrCloud
}
