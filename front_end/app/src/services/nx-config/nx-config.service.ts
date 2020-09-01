import { Injectable }        from '@angular/core';
import { HttpClient }        from '@angular/common/http';

import { IConfig }           from './config-types';
import { nxConfig }          from './config';
import { environment }       from '../../../environments/environment';
import webAdminMenus         from '../../../customization/menus.json';

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
        const menus = !NxConfigService.isLocal ? {} : webAdminMenus.reduce(
            (menus, { name, nodes }) => {
                menus[name] = nodes;
                return menus;
            }, {});
        return NxConfigService.isLocal
            ? Promise.resolve({ menus })
            : this.http.get('/api/utils/settings').toPromise();
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
