import { Injectable } from '@angular/core';

import { environment } from '@environments/environment';

import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxLanguageProviderService } from './nx-language-provider';

@Injectable({
    providedIn: 'root',
})
export class NxBootstrapProvider {
    CONFIG: IConfig;
    readonly environment = environment;

    static isLoaded: boolean;
    static isNewSystem: boolean;

    constructor(
        private configService: NxConfigService,
        private languageService: NxLanguageProviderService,
    ) {
        this.#init();
    }

    /**
     * To determine if the javascript client API is available the initialization code from the server https://networkoptix.atlassian.net/wiki/spaces/FS/pages/2605678593/In-client+JavaScript+API+specification#Entry-point
     *
     * The initialization code for javascript client API blocks the main thread. If the requestIdleCallback gets called then that means that the javascript client api isn't available.
     *
     * @returns boolean
     */
    #isVmsApiAvailable = () =>
        new Promise(resolve => {
            // @ts-expect-error
            window.vmsApiInit = () => resolve(true);
            if (window.requestIdleCallback) {
                requestIdleCallback(() => resolve(false));
            } else {
                setTimeout(() => resolve(false));
            }
        });

    #useRefreshTokenFromVms = async () => {
        // @ts-expect-error
        const refreshToken = await window?.vms?.auth.cloudToken();
        if (!refreshToken) {
            return;
        }
        const url = new URL(window.location.href);
        url.searchParams.set('refresh_token', refreshToken);
        window.history.pushState({ url: url.toString() }, '', url.toString());
    };

    #init = async (): Promise<void> => {
        this.CONFIG = this.configService.getConfig();
        NxBootstrapProvider.isLoaded = false;
        NxBootstrapProvider.isNewSystem = false;

        if (await this.#isVmsApiAvailable()) {
            await this.#useRefreshTokenFromVms();
        }
    };

    private getModuleInfo(reload = true) {
        return this.environment.isLocal
            ? fetch('/rest/v1/servers/this/info', {}).then(response => response.json())
            : Promise.resolve({});
    }

    load(): Promise<boolean> {
        this.CONFIG = this.configService.config;
        this.languageService.defaultLanguage = this.CONFIG.defaultLanguage;

        return new Promise<boolean>((resolve, reject) => {
            return Promise.all([
                this.CONFIG.preloadedTranslation
                    ? Promise.resolve(this.CONFIG.preloadedTranslation)
                    : this.languageService.loadLanguage(),
                this.getModuleInfo(),
            ])
                .then(([language, moduleInfo]: any) => {
                    this.languageService.setTranslations(language.language, language);
                    this.CONFIG.viewsDir = 'static/lang_' + language.language + '/views/';
                    if (!!moduleInfo && Object.keys(moduleInfo).length > 0) {
                        NxBootstrapProvider.isNewSystem =
                            moduleInfo?.serverFlags?.includes('SF_NewSystem'); // In the event serverFlags are missing we can assume that the system isn't new.
                        this.setLocalInfo(moduleInfo).then(() => {
                            this.configService.updateConfigUsingOverrides();
                            NxBootstrapProvider.isLoaded = true;
                            resolve(true);
                        });
                    } else {
                        NxBootstrapProvider.isLoaded = true;
                        resolve(true);
                    }
                })
                .catch(err => {
                    console.error(err);
                    // some fail handling is done in app component
                    NxBootstrapProvider.isLoaded = true;
                    resolve(true);
                })
                .finally(() => {
                    document.querySelector('body').style.backgroundColor = null;
                });
        });
    }

    setLocalInfo = async (data): Promise<void> => {
        const hostProtocol = data.cloudHost.split('://')[0];
        this.CONFIG.cloudHost =
            hostProtocol === data.cloudHost ? `https://${data.cloudHost}` : data.cloudHost;
        // this.CONFIG.featureFlags = await this.http.get<Record<string, unknown>>(`${this.CONFIG.cloudHost}/api/utils/webadmin_feature_flags/`, {}).toPromise().catch(() => ({}));
        this.CONFIG.cloudSystemId = data.cloudSystemId;
        this.CONFIG.organizationId = data.organizationId;
        this.CONFIG.localSystemId = data.localSystemId;
        this.CONFIG.localServerId = data.id;
        this.CONFIG.system.name = data.systemName || data.name;

        const [_, major, minor] = data.version.match(/(\d+\.\d+)\.\d+\.(\d+)/);
        this.CONFIG.system.version = { major: parseFloat(major), minor: parseInt(minor) };
    };
}
