import { coerceArray } from '@angular/cdk/coercion';
import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';

import { environment } from '@environments/environment';
import { FeatureFlagType } from '@services/nx-config/base-config';
import { WINDOW } from '@services/window-provider';

import { nxConfig } from './config';
import { IConfig } from './config-types';

const findNode = <T>(targetObject: T, nodes: string[]) => nodes.reduce((ref, nodeName) => ref[nodeName], targetObject);

@Injectable({
    providedIn: 'root'
})
export class NxConfigService {
    config: IConfig;
    static OVERRIDE_KEY = 'configOverrides';

    static configChanged: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    constructor(
        private http?: HttpClient,
        @Inject(WINDOW) private window?: Window,
        private session?: LocalStorageService
    ) {
        // These properties will be injected on config *******************
        // viewsDir: 'static/views/', //'static/lang_' + lang + '/views/';
        // previewPath: '',
        // ***************************************************************

        this.config = nxConfig;

        this.attachDebugConfigToWindow();
    }

    public generateDebugConfigProxy() {
        const window = this.window;

        // @ts-expect-error
        this.window.resetConfigOverrides = () => this.window.confirm('Do you want to reset overrides?') &&
            this.session.store(NxConfigService.OVERRIDE_KEY, {}) &&
            this.window.confirm('Reload page to update config?') &&
            this.window.location.reload();

        const debugHandlerFactory = ((configRef = this.config, session = this.session) => (nodeNames = []): ProxyHandler<IConfig> => ({
            set(target, property, value) {
                const currentNodeString = [...nodeNames, property].join('.');
                session.store(NxConfigService.OVERRIDE_KEY, { ...session.retrieve(NxConfigService.OVERRIDE_KEY), [currentNodeString]: value });
                if (window.confirm('Reload window to apply changes?')) {
                    window.location.reload();
                }
                return true;
            },
            get(target, property) {
                const currentNode = [...nodeNames, property];
                const currentNodeString = currentNode.join('.');
                const value = findNode(configRef, currentNode);
                const settingType = typeof value;
                if (['number', 'boolean', 'string'].includes(settingType)) {
                    // Replace primitive values with updater
                    return {
                        value,
                        settingType,
                        get showPromptNewValue() {
                            const newValue = window.prompt(`Updated Value for "${currentNodeString}"`, value);
                            session.store(NxConfigService.OVERRIDE_KEY, { ...session.retrieve(NxConfigService.OVERRIDE_KEY), [currentNodeString]: newValue });
                            if (window.confirm('Reload window to apply changes?')) {
                                window.location.reload();
                            }
                            return newValue;
                        },
                        saveSetting(newValue, reload = false) {
                            session.store(NxConfigService.OVERRIDE_KEY, { ...session.retrieve(NxConfigService.OVERRIDE_KEY), [currentNodeString]: newValue });
                            if (reload) {
                                this.window.location.reload();
                            }
                        }
                    };
                }

                return new Proxy(value, debugHandlerFactory([...nodeNames, property]));
            }
        }))();

        return new Proxy(this.config, debugHandlerFactory());
    }

    private attachDebugConfigToWindow(): void {
        if (this.window) {
            // @ts-expect-error
            window.debugConfig = this.generateDebugConfigProxy();
        }
    }

    get cloudHost() {
        return this.config.cloudHost;
    }

    updateConfigUsingOverrides(config = this.config): void {
        Object.entries(this.session.retrieve(NxConfigService.OVERRIDE_KEY) || {}).forEach(([nodesString, value]) => {
            const nodes = nodesString.split('.');
            const property = nodes.pop();
            const target = findNode(config, nodes);
            target[property] = value;
        });
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

    static get isDarkTheme() {
        return nxConfig.isDarkTheme;
    }

    static set isDarkTheme(res: boolean) {
        nxConfig.isDarkTheme = res;
        this.configChanged.next(true);
    }
}
