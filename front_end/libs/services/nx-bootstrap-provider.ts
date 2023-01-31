import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';

import { environment } from '@environments/environment';
import { NxSystemRole } from '@services/system.service/user-manager/user-manager-types';
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
        let setLangFail = false;
        return new Promise<boolean>((resolve, reject) => {
            this.CONFIG = this.configService.getConfig();
            return this.configService.getSettings().then((settings: any) => {
                // this language will be used as a fallback when a translation
                // isn't found in the current language
                this.setSettings(settings);
                this.languageService.defaultLanguage = this.CONFIG.defaultLanguage;

                return Promise.all([
                    this.languageService.loadLanguage(),
                    this.getModuleInfo()
                ]);
            }).then(([language, moduleInfo]: any) => {
                // language fail may have special character or
                // syntax error ... like use of double curly braces
                try {
                    this.setLanguage(language);
                } catch (e) {
                    setLangFail = true;
                }

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
                if (setLangFail) {
                    this.languageService.currentLang = this.CONFIG.defaultLanguage;
                    new Promise(() => {
                        this.languageService.loadLanguage();
                    }).then(language => {
                        this.setLanguage(language);
                        this.isLoaded = true;
                        console.info('Loaded default language due to an error while setting up desired language.');
                        resolve(true);
                    });
                }
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

            const { companyLink, companyName, copyrightYear, privacyLink, supportLink, customization, licenseServer } = data;
            this.CONFIG.licenseServer = licenseServer;
            this.CONFIG.customization = customization;
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
            if (data.themeConfig) {
                this.CONFIG.themeConfig = data.themeConfig;
            }
            this.CONFIG.integration.seoPageDesc = data.integrationSeoPageDescription;
            this.CONFIG.landing.description = data.landingDescription;

            // detect preview mode
            if (this.window.location.href.includes('preview')) {
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
