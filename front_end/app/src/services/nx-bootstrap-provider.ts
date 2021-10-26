import { Injectable }                from '@angular/core';
import { HttpClient }                from '@angular/common/http';

import { IConfig, NxConfigService }  from './nx-config';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxSystemRole }              from './system.service/system/user-manager/user-manager-types';
import { NxPageService }             from './page.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';

@Injectable({
    providedIn: 'root'
})
export class NxBootstrapProvider {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    private isLoaded: boolean;
    private isNewSystem: boolean;

    constructor(
        private configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private pageService: NxPageService,
        private http: HttpClient
    ) {
        this.CONFIG = this.configService.getConfig();
        this.isLoaded = false;
        this.isNewSystem = false;
    }

    get loaded() {
        return this.isLoaded;
    }

    get newSystem(): boolean {
        return this.isNewSystem;
    }

    private checkLocalIfNew(reload = true) {
        return NxConfigService.isLocal
            ? this.http.get('/api/moduleInformation', {}).toPromise()
            : Promise.resolve({});
    }

    load(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.CONFIG = this.configService.getConfig();
            this.languageService.defaultLanguage = this.CONFIG.defaultLanguage;
            return Promise.all([
                this.configService.getSettings(),
                this.languageService.loadLanguage(),
                this.checkLocalIfNew()
            ]).then((result: any) => {
                // this language will be used as a fallback when a translation
                // isn't found in the current language
                this.languageService.defaultLanguage = this.CONFIG.defaultLanguage;
                this.setSettings(result[0]);
                this.setLanguage(result[1]);

                if (result[2].reply) {
                    this.setLocalInfo(result[2].reply);
                    this.isNewSystem = result[2].reply.serverFlags.includes('SF_NewSystem');
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

    setLocalInfo(data) {
        const hostProtocol = data.cloudHost.split('://')[0];
        this.CONFIG.cloudHost = (hostProtocol === data.cloudHost) ? `https://${data.cloudHost}` : data.cloudHost;
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
            '%SUPPORT_LINK%': this.CONFIG.company.link,
            '%COMPANY_NAME%': this.CONFIG.company.name
        };
        const processLanguage = (language) => {
            Object.entries(language).forEach(([key, phrase]) => {
                if (typeof phrase === 'string') {
                    language[key] = Object.entries(customStrings)
                        .reduce((text: string, [rKey, rValue]) => text.replace(rKey, rValue), phrase);
                } else if (typeof phrase !== 'number') {
                    language[key] = processLanguage(phrase);
                }
            });
            return language;
        };
        this.languageService.setTranslations(data.language, processLanguage(data));
        this.LANG = this.languageService.translations;
        this.pageService.newLanguage = this.LANG; // during the init of the service LANG is undefined
        this.pageService.pageTitle = this.LANG.pageTitles.default?.();

        this.CONFIG.viewsDir = 'static/lang_' + data.language + '/views/';
    }

    setSettings(data) {
        if (this.CONFIG.isLocal) {
            // weird timing issue occur when using method updateConfig. Re-factored to explicit assignment. (TT)
            const { description, webadminConfig, supportedLanguages } = data;
            this.CONFIG.dynamicMenus = webadminConfig.dynamicMenus?.reduce((menu, { name, nodes }) => {
                menu[name] = {
                    title: name,
                    description: '',
                    nodes: nodes
                };
                return menu;
            }, {});
            this.CONFIG.cloudName = description.cloudName;
            this.CONFIG.vmsName = description.vmsName;
            this.CONFIG.company = {
                copyrightYear: description.copyrightYear,
                links: {
                    website: description.contact.supportAddress
                },
                name: description.companyName
            };
            this.CONFIG.defaultLanguage = description.defaultLanguage;
            this.CONFIG.licenseTypes = webadminConfig.licenseTypes;
            // Fallback in case licenseTypes from webadmin_config.json is made a string in the cms
            if (typeof webadminConfig.licenseTypes === 'string') {
                this.CONFIG.licenseTypes = JSON.parse(webadminConfig.licenseTypes);
            }
            this.CONFIG.trialLicenseKey = description.desktop.trialLicenseKey;

            let languages = supportedLanguages.length ? supportedLanguages : [description.defaultLanguage];
            if (description?.customLanguages?.length) {
                languages = description.customLanguages;
            } else if (webadminConfig?.supportedLanguages?.length) {
                languages = webadminConfig.supportedLanguages;
            }
            this.CONFIG.supportedLanguages = languages;
        } else if (!this.CONFIG.isLocal && Object.keys(data).length > 0) {
            // extend CONFIG ... ugly // @ts-ignore ... no implementation for // @ts-ignore-start/end
            // This was done every time a system is created. Its only need once
            this.CONFIG.accessRoles.predefinedRoles.forEach((option: NxSystemRole) => {
                if (option.permissions) {
                    option.permissions = option.permissions.split('|').sort().join('|');
                }
            });

            // @ts-ignore
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

            const { developersEnabled, feedbackEnabled, integrationStoreEnabled, publicDownloads, publicReleases, cloudStorageEnabled, cloudStorageSize, customClientsEnabled, alexaIntegrationEnabled = false, bookmarksEnabled = false, featureFlags = {} } = data;
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

            const { searchTags, showAnalyticsEvents, sortSupportedDevicesByPopularity, supportedHardwareTypes, supportedResolutions, vendorsShown } = data;
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
            this.CONFIG.pushConfig = data.pushConfig;
            this.CONFIG.testedOperatingSystems = data.testedOperatingSystems;
            this.CONFIG.trafficRelayHost = data.trafficRelayHost;
            this.CONFIG.trialLicenseKey = data.trialLicenseKey;
            this.CONFIG.vmsName = data.vmsName;

            this.CONFIG.integration.seoPageDesc = data.integrationSeoPageDescription;
            this.CONFIG.landing.description = data.landingDescription;

            // detect preview mode
            if (window.location.href.indexOf('preview') >= 0) {
                this.CONFIG.previewPath = 'preview';
                this.CONFIG.viewsDir = this.CONFIG.previewPath + '/' + this.CONFIG.viewsDir;
            }
            this.CONFIG.docMenuMap = data?.docMenuMap;
            this.CONFIG.licenseTypes = data?.licenseTypes;

            if (data?.menus) {
                const authorizeFooterNodes = data.menus.footer.nodes.reduce((res, item) => {
                    if (['Privacy', 'Terms'].includes(item.name) || item.name.includes('About')) {
                        if (item.name === 'Privacy') {
                            item.name = 'Privacy Policy';
                        }
                        res.push(item);
                    }
                    return res;
                }, []);
                const authorizeFooter = JSON.parse(JSON.stringify(data.menus.footer));
                authorizeFooter.nodes = authorizeFooterNodes;
                data.menus.authorizeFooter = authorizeFooter;
            }
            this.CONFIG.dynamicMenus = data?.menus;

            Object.assign(this.CONFIG.featureFlags, featureFlags);
        }

        // Temporary link to Swagger
        // TODO: Add this to CMS in 21.1
        // data && data.menus.header.nodes.push({
        //     asset_type        : null,
        //     authentication    : 'Both',
        //     display_name      : 'API Tool',
        //     icon              : '',
        //     name              : 'API Tool',
        //     new_window        : false,
        //     next_item         : false,
        //     order             : 9,
        //     related_asset_ids : [],
        //     url               : '/doc/developers/api-tool/'
        // });
    }
}
