import { coerceArray } from '@angular/cdk/coercion';
import { Injectable, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';

import { FeatureFlagType } from '@services/nx-config/base-config';

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

    constructor(private session?: LocalStorageService) {
        // These properties will be injected on config *******************
        // viewsDir: 'static/views/', //'static/lang_' + lang + '/views/';
        // previewPath: '',
        // ***************************************************************

        try {
            const dynamicConfig = inject(DynamicConfig);
            this.config = dynamicConfig?.config;
        } catch (_) {}

        this.config ||= nxConfig;
        this.updateConfigUsingOverrides();
        this.attachDebugConfigToWindow();
    }

    public generateDebugConfigProxy(): IConfig {
        // @ts-expect-error: Dev debugging stuff
        window.resetConfigOverrides = () =>
            window.confirm('Do you want to reset overrides?') &&
            this.session.store(NxConfigService.OVERRIDE_KEY, {}) &&
            window.confirm('Reload page to update config?') &&
            window.location.reload();

        const debugHandlerFactory = (
            (configRef = this.config, session = this.session, windowRef = window) =>
            (nodeNames: (string | symbol)[] = []): ProxyHandler<IConfig> => ({
                set(target, property, value) {
                    const currentNodeString = [...nodeNames, property].join('.');
                    session.store(NxConfigService.OVERRIDE_KEY, {
                        ...session.retrieve(NxConfigService.OVERRIDE_KEY),
                        [currentNodeString]: value,
                    });
                    if (windowRef.confirm('Reload window to apply changes?')) {
                        windowRef.location.reload();
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
                                const newValue = windowRef.prompt(
                                    `Updated Value for "${currentNodeString}"`,
                                    value as string,
                                );
                                session.store(NxConfigService.OVERRIDE_KEY, {
                                    ...session.retrieve(NxConfigService.OVERRIDE_KEY),
                                    [currentNodeString]: newValue,
                                });
                                if (windowRef.confirm('Reload window to apply changes?')) {
                                    windowRef.location.reload();
                                }
                                return newValue;
                            },
                            saveSetting(newValue, reload = false) {
                                session.store(NxConfigService.OVERRIDE_KEY, {
                                    ...session.retrieve(NxConfigService.OVERRIDE_KEY),
                                    [currentNodeString]: newValue,
                                });
                                if (reload) {
                                    windowRef.location.reload();
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
        if (window) {
            // @ts-expect-error: Dev debugging stuff
            window.debugConfig = this.generateDebugConfigProxy();
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
