import { coerceArray } from '@angular/cdk/coercion';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { environment } from '@environments/environment';
import { FeatureFlagType } from '@services/nx-config/base-config';

import { nxConfig } from './config';
import { IConfig } from './config-types';

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
        if (environment.isLocal) {
            const webadminConfigRequest =
                this.http.get('/static/customization/webadmin_config.json').toPromise();
            const descriptionRequest =
                this.http.get('/static/customization/description.json').toPromise();
            const supportedLanguagesRequest =
                this.http.get('/static/supported_languages.json').toPromise();
            return Promise.all([webadminConfigRequest, descriptionRequest, supportedLanguagesRequest])
                .then(([webadminConfig, description, supportedLanguages]: [Object, Object, any]) => ({
                    defaultLanguage: supportedLanguages.default,
                    supportedLanguages: supportedLanguages.supported,
                    webadminConfig,
                    description
                }));
        } else {
            return this.http.get('/api/utils/settings').toPromise();
        }
    }

    getConfig() {
        return this.config;
    }

    flagsEnabled(flags: boolean | FeatureFlagType | (FeatureFlagType | boolean)[]) {
        return coerceArray(flags).every(key => {
            if (typeof key === 'boolean') {
                return key;
            } else if (key) {
                return !!this.config.featureFlags[key];
            }
            return false;
        });
    }

    static get isLocal() {
        return nxConfig.isLocal;
    }

    static get isDarkTheme() {
        return nxConfig.isDarkTheme;
    }

    static set isDarkTheme(res: boolean) {
        nxConfig.isDarkTheme = res;
    }

    static resolveLocalOrCloud = <Local, Cloud>(local: Local, cloud: Cloud) => {
        return NxConfigService.isLocal ? local : cloud;
    };

    public resolveLocalOrCloud = NxConfigService.resolveLocalOrCloud;
}
