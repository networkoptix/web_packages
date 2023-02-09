import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';

import { environment } from '@environments/environment';
import { processLanguageFactory } from '@utils/nx';

import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxLanguageProviderService } from './nx-language-provider';
import { WINDOW } from './window-provider';

@Injectable({
    providedIn: 'root'
})
export class NxBootstrapProvider {
    CONFIG: IConfig;
    readonly environment = environment;

    private isLoaded: boolean;
    private isNewSystem: boolean;

    constructor(
        private configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private http: HttpClient,
        @Inject(WINDOW) private window: Window
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
    #isVmsApiAvailable = () => new Promise(resolve => {
        // @ts-expect-error
        this.window.vmsApiInit = () => resolve(true);
        this.window.requestIdleCallback
            ? requestIdleCallback(() => resolve(false))
            : setTimeout(() => resolve(false));
    });

    #useRefreshTokenFromVms = async () => {
        // @ts-expect-error
        const refreshToken = await this.window?.vms?.auth.cloudToken();
        if (!refreshToken) {
            return;
        }
        const url = new URL(this.window.location.href);
        url.searchParams.set('refresh_token', refreshToken);
        this.window.history.pushState({ url: url.toString() }, '', url.toString());
    };

    #init = async (): Promise<void> => {
        this.CONFIG = this.configService.getConfig();
        this.isLoaded = false;
        this.isNewSystem = false;

        if (await this.#isVmsApiAvailable()) {
            await this.#useRefreshTokenFromVms();
        }
    };

    get loaded() {
        return this.isLoaded;
    }

    get newSystem(): boolean {
        return this.isNewSystem;
    }

    private getModuleInfo(reload = true) {
        return this.environment.isLocal
            ? this.http.get('/api/moduleInformation', {}).toPromise()
            : Promise.resolve({});
    }

    load(): Promise<boolean> {
        this.CONFIG = this.configService.config;
        this.languageService.defaultLanguage = this.CONFIG.defaultLanguage;

        return new Promise<boolean>((resolve, reject) => {
            return Promise.all([
                this.CONFIG.preloadedTranslation ? Promise.resolve(this.CONFIG.preloadedTranslation) : this.languageService.loadLanguage(),
                this.getModuleInfo()
            ]).then(([language, moduleInfo]: any) => {
                this.setLanguage(language);

                if (moduleInfo.reply) {
                    this.isNewSystem = moduleInfo.reply.serverFlags.includes('SF_NewSystem');
                    this.setLocalInfo(moduleInfo.reply).then(() => {
                        this.configService.updateConfigUsingOverrides();
                        this.isLoaded = true;
                        resolve(true);
                    });
                } else {
                    this.isLoaded = true;
                    resolve(true);
                }
            }).catch(err => {
                console.error(err);
                // some fail handling is done in app component
                this.isLoaded = true;
                resolve(true);
            }).finally(() => {
                this.window.document.querySelector('body').style.backgroundColor = null;
            });
        });
    }

    setLocalInfo = async (data): Promise<void> => {
        const hostProtocol = data.cloudHost.split('://')[0];
        this.CONFIG.cloudHost = (hostProtocol === data.cloudHost)
            ? `https://${data.cloudHost}`
            : data.cloudHost;
        // this.CONFIG.featureFlags = await this.http.get<Record<string, unknown>>(`${this.CONFIG.cloudHost}/api/utils/webadmin_feature_flags/`, {}).toPromise().catch(() => ({}));
        this.CONFIG.cloudSystemId = data.cloudSystemId;
        this.CONFIG.localSystemId = data.localSystemId;
        this.CONFIG.localServerId = data.id;
        this.CONFIG.system.name = data.systemName || data.name;
    };

    setLanguage(data) {
        // this.languageService.newTranslation = { language: data.ajs.language, json: data.i18n };
        const customStrings = {
            '%CLOUD_NAME%': this.CONFIG.cloudName,
            '%VMS_NAME%': this.CONFIG.vmsName,
            '%SUPPORT_LINK%': this.CONFIG.company.links.website,
            '%COMPANY_NAME%': this.CONFIG.company.name
        };
        const processLanguage = processLanguageFactory(customStrings);
        this.languageService.setTranslations(data.language, processLanguage(data));

        this.CONFIG.viewsDir = 'static/lang_' + data.language + '/views/';
    }
}
