import { coerceArray } from '@angular/cdk/coercion';
import { Inject, Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';

import { FeatureFlagType } from '@services/nx-config/base-config';
import { WINDOW } from '@services/window-provider';

import { nxConfig } from './config';
import { IConfig } from './config-types';
import { DynamicConfig } from './dynamic-config';

const findNode = <T>(targetObject: T, nodes: (string | symbol)[]): unknown =>
    nodes.reduce((ref, nodeName) => ref[nodeName], targetObject);

@Injectable({
    providedIn: 'root',
})
export class NxConfigService {
    config: IConfig;
    static OVERRIDE_KEY = 'configOverrides';

    static configChanged: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    constructor(
        @Inject(WINDOW)
        private window?: Window & {
            debugConfig: IConfig;
            resetConfigOverrides: () => void;
        },
        private session?: LocalStorageService,
        dynamicConfig?: DynamicConfig,
    ) {
        // These properties will be injected on config *******************
        // viewsDir: 'static/views/', //'static/lang_' + lang + '/views/';
        // previewPath: '',
        // ***************************************************************

        this.config = dynamicConfig?.config || nxConfig;
        this.updateConfigUsingOverrides();
        this.attachDebugConfigToWindow();
    }

    public generateDebugConfigProxy(): IConfig {
        const window = this.window;

        this.window.resetConfigOverrides = () =>
            this.window.confirm('Do you want to reset overrides?') &&
            this.session.store(NxConfigService.OVERRIDE_KEY, {}) &&
            this.window.confirm('Reload page to update config?') &&
            this.window.location.reload();

        const debugHandlerFactory = (
            (configRef = this.config, session = this.session) =>
            (nodeNames: (string | symbol)[] = []): ProxyHandler<IConfig> => ({
                set(target, property, value) {
                    const currentNodeString = [...nodeNames, property].join('.');
                    session.store(NxConfigService.OVERRIDE_KEY, {
                        ...session.retrieve(NxConfigService.OVERRIDE_KEY),
                        [currentNodeString]: value,
                    });
                    if (window.confirm('Reload window to apply changes?')) {
                        window.location.reload();
                    }
                    return true;
                },
                get(target, property) {
                    const currentNode = [...nodeNames, property];
                    const currentNodeString = currentNode.join('.');
                    const value = findNode(configRef, currentNode);
                    if (property === 'toJSON') {
                        return () => "Don't use";
                    }
                    const settingType = typeof value;
                    if (['number', 'boolean', 'string'].includes(settingType)) {
                        // Replace primitive values with updater
                        return {
                            value,
                            settingType,
                            get showPromptNewValue() {
                                const newValue = window.prompt(
                                    `Updated Value for "${currentNodeString}"`,
                                    value as string,
                                );
                                session.store(NxConfigService.OVERRIDE_KEY, {
                                    ...session.retrieve(NxConfigService.OVERRIDE_KEY),
                                    [currentNodeString]: newValue,
                                });
                                if (window.confirm('Reload window to apply changes?')) {
                                    window.location.reload();
                                }
                                return newValue;
                            },
                            saveSetting(newValue, reload = false) {
                                session.store(NxConfigService.OVERRIDE_KEY, {
                                    ...session.retrieve(NxConfigService.OVERRIDE_KEY),
                                    [currentNodeString]: newValue,
                                });
                                if (reload) {
                                    this.window.location.reload();
                                }
                            },
                        };
                    } else if (typeof value === 'object') {
                        return new Proxy(value, debugHandlerFactory([...nodeNames, property]));
                    }
                },
            })
        )();

        return new Proxy(this.config, debugHandlerFactory());
    }

    private attachDebugConfigToWindow(): void {
        if (this.window) {
            this.window.debugConfig = this.generateDebugConfigProxy();
        }
    }

    get cloudHost(): string {
        return this.config.cloudHost;
    }

    updateConfigUsingOverrides(config = this.config): void {
        Object.entries(this.session.retrieve(NxConfigService.OVERRIDE_KEY) || {}).forEach(
            ([nodesString, value]) => {
                const nodes = nodesString.split('.');
                const property = nodes.pop();
                const target = findNode(config, nodes);
                target[property] = value;
            },
        );
    }

    getConfig(): IConfig {
        return this.config;
    }

    flagsEnabled(flags: boolean | FeatureFlagType | (FeatureFlagType | boolean)[]): boolean {
        return coerceArray(flags).every(key => {
            if (typeof key === 'boolean') {
                return key;
            } else if (key) {
                return !!this.config.featureFlags[key];
            }
            return false;
        });
    }

    static get isDarkTheme(): boolean {
        return nxConfig.isDarkTheme;
    }

    static set isDarkTheme(res: boolean) {
        nxConfig.isDarkTheme = res;
        this.configChanged.next(true);
    }
}
