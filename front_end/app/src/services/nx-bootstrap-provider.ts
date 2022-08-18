import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import { NxSystemRole } from '@services/system.service/user-manager/user-manager-types';
import { processLanguageFactory } from '@utils/general';

import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxPageService } from './page.service';
import { WINDOW } from './window-provider';

@Injectable({
    providedIn: 'root'
})
export class NxBootstrapProvider {
    CONFIG: IConfig;
    readonly environment = environment;
    LANG: LanguageI18NStaticTypes;

    private isLoaded: boolean;
    private isNewSystem: boolean;

    constructor(
        private configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private pageService: NxPageService,
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
        requestIdleCallback(() => resolve(false));
    });

    #useRefreshTokenFromVms = async () => {
        // @ts-expect-error
        const refreshToken = await this.window.vms.auth.cloudToken();
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

    private checkLocalIfNew(reload = true) {
        return this.environment.isLocal
            ? this.http.get('/api/moduleInformation', {}).toPromise()
            : Promise.resolve({});
    }

    load(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.CONFIG = this.configService.getConfig();
            return this.configService.getSettings().then((settings: any) => {
                // this language will be used as a fallback when a translation
                // isn't found in the current language
                this.setSettings(settings);
                this.languageService.defaultLanguage = this.CONFIG.defaultLanguage;

                return Promise.all([
                    this.languageService.loadLanguage(),
                    this.checkLocalIfNew()
                ]);
            }).then(([language, moduleInfo]: any) => {
                this.setLanguage(language);

                if (moduleInfo.reply) {
                    this.setLocalInfo(moduleInfo.reply);
                    this.isNewSystem = moduleInfo.reply.serverFlags.includes('SF_NewSystem');
                }

                this.isLoaded = true;
                resolve(true);
            }).catch(err => {
                console.error(err);
                // handle fail in app component
                this.languageService.defaultLanguage = this.CONFIG.defaultLanguage;
                resolve(true);
            });
        });
    }

    setLocalInfo(data): void {
        const hostProtocol = data.cloudHost.split('://')[0];
        this.CONFIG.cloudHost = (hostProtocol === data.cloudHost)
            ? `https://${data.cloudHost}`
            : data.cloudHost;
        this.CONFIG.cloudSystemId = data.cloudSystemId;
        this.CONFIG.localSystemId = data.localSystemId;
        this.CONFIG.localServerId = data.id;
        this.CONFIG.system.name = data.systemName || data.name;
    }

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
        this.LANG = this.languageService.translations;
        this.pageService.newLanguage = this.LANG; // during the init of the service LANG is undefined
        if (!this.CONFIG.isLocal && !this.pageService.pageTitle) {
            this.pageService.pageTitle = this.LANG.pageTitles.default?.();
        }

        this.CONFIG.viewsDir = 'static/lang_' + data.language + '/views/';
    }

    setSettings(data): void {
        if (this.environment.isLocal) {
            // weird timing issue occur when using method updateConfig. Re-factored to explicit assignment. (TT)
            const { defaultLanguage, description, webadminConfig, supportedLanguages } = data;
            this.CONFIG.dynamicMenus = webadminConfig.dynamicMenus?.reduce((menu, { name, nodes }) => {
                menu[name] = {
                    title: name,
                    description: '',
                    nodes
                };
                return menu;
            }, {});
            this.CONFIG.cloudName = description.cloudName;
            this.CONFIG.vmsName = description.vmsName;
            this.CONFIG.company = {
                copyrightYear: description.copyrightYear,
                links: {
                    website: description.contact.companyUrl,
                    support: description.contact.supportAddress
                },
                name: description.companyName
            };
            this.CONFIG.licenseTypes = webadminConfig.licenseTypes;
            // Fallback in case licenseTypes from webadmin_config.json is made a string in the cms
            if (typeof webadminConfig.licenseTypes === 'string') {
                this.CONFIG.licenseTypes = JSON.parse(webadminConfig.licenseTypes);
            }
            this.CONFIG.trialLicenseKey = description.desktop.trialLicenseKey;

            this.CONFIG.defaultLanguage = defaultLanguage || description.defaultLanguage || this.CONFIG.defaultLanguage;
            this.CONFIG.supportedLanguages = supportedLanguages.length ? supportedLanguages : [this.CONFIG.defaultLanguage];
        } else if (!this.environment.isLocal && Object.keys(data).length > 0) {
            // extend CONFIG ... ugly // @ts-ignore ... no implementation for // @ts-ignore-start/end
            // This was done every time a system is created. Its only need once
            this.CONFIG.accessRoles.predefinedRoles.forEach((option: NxSystemRole) => {
                if (option.permissions) {
                    option.permissions = option.permissions.split('|').sort().join('|');
                }
            });

            const { companyLink, companyName, copyrightYear, privacyLink, supportLink } = data;
            this.CONFIG.company = {
                copyrightYear,
                links: {
                    privacy: privacyLink,
                    support: supportLink,
                    website: companyLink
                },
                name: companyName
            };

            const {
                developersEnabled,
                feedbackEnabled,
                integrationStoreEnabled,
                publicDownloads,
                publicReleases,
                cloudStorageEnabled,
                cloudStorageSize,
                customClientsEnabled,
                alexaIntegrationEnabled = false,
                bookmarksEnabled = false,
                featureFlags = {}
            } = data;
            this.CONFIG.cloudCapabilities = {
                developersEnabled,
                feedbackEnabled,
                integrationStore: integrationStoreEnabled,
                publicDownloads,
                publicReleases,
                cloudStorageEnabled,
                cloudStorageSize,
                customClientsEnabled,
                alexaIntegrationEnabled: featureFlags.alexaIntegration && alexaIntegrationEnabled,
                bookmarksEnabled: featureFlags.bookmarks && bookmarksEnabled
            };

            const {
                searchTags,
                showAnalyticsEvents,
                sortSupportedDevicesByPopularity,
                supportedHardwareTypes,
                supportedResolutions,
                vendorsShown
            } = data;
            this.CONFIG.ipvd = Object.assign({}, this.CONFIG.ipvd, {
                searchTags,
                showAnalyticsEvents,
                sortSupportedDevicesByPopularity,
                supportedHardwareTypes,
                supportedResolutions,
                vendorsShown: parseInt(vendorsShown)
            });

            const { integrationFilterItems, integrationFilterLimitation } = data;
            this.CONFIG.integration.filter = {
                items: integrationFilterItems,
                limitation: integrationFilterLimitation
            };

            if (data.appTypesForPlatform) {
                Object.entries(data.appTypesForPlatform).forEach(([platform, appTypes]: [string, any]) => {
                    if (platform in this.CONFIG.downloads.groups && appTypes) {
                        this.CONFIG.downloads.groups[platform].appTypes = appTypes;
                    }
                });
            }

            this.CONFIG.cloudName = data.cloudName;
            this.CONFIG.googleTagManagerId = data.googleTagManagerId;
            this.CONFIG.cloudMonitoring.logRocket = data.logRocket;
            this.CONFIG.cloudMonitoring.fullStory = data.fullStory;
            this.CONFIG.pushConfig = data.pushConfig;
            this.CONFIG.testedOperatingSystems = data.testedOperatingSystems;
            this.CONFIG.trafficRelayHost = data.trafficRelayHost;
            this.CONFIG.trialLicenseKey = data.trialLicenseKey;
            this.CONFIG.vmsName = data.vmsName;

            this.CONFIG.integration.seoPageDesc = data.integrationSeoPageDescription;
            this.CONFIG.landing.description = data.landingDescription;

            // detect preview mode
            if (window.location.href.includes('preview')) {
                this.CONFIG.previewPath = 'preview';
                this.CONFIG.viewsDir = this.CONFIG.previewPath + '/' + this.CONFIG.viewsDir;
            }
            this.CONFIG.docMenuMap = data?.docMenuMap;
            this.CONFIG.licenseTypes = data?.licenseTypes;

            this.CONFIG.dynamicMenus = data?.menus;

            Object.assign(this.CONFIG.featureFlags, featureFlags);
        }

        this.configService.updateConfigUsingOverrides(this.CONFIG);
    }
}
