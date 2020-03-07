import { Injectable }                from '@angular/core';
import { downgradeInjectable }       from '@angular/upgrade/static';
import { IConfig } from './config-types';
import { nxConfig } from './config';

@Injectable({
    providedIn: 'root'
})
export class NxConfigService {
    config: IConfig;

    constructor() {
        // These properties will be injected on config *******************
        // viewsDir: 'static/views/', //'static/lang_' + lang + '/views/';
        // previewPath: '',
        // viewsDirCommon: 'static/web_common/views/',
        // ***************************************************************

        this.config = nxConfig;
    }

    getConfig() {
        return this.config;
    }
}
