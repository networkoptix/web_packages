import { Injectable }                from '@angular/core';
import { HttpClient }                from '@angular/common/http';

import { IConfig, NxConfigService }  from './nx-config';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxSystemRole }              from './system.service';
import { NxPageService }             from './page.service';
import { LanguageI18NStaticTypes }   from '../../language_i18n_static_types';

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

    private getWebadminConfig() {
        return this.http.get('/static/customization/webadmin_config.json');
    }

    load(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            return this.getCustomization().then(() => {
                this.CONFIG = this.configService.getConfig();
                this.languageService.defaultLanguage = this.CONFIG.defaultLanguage;
                return Promise.resolve();
            }).then(() => {
                return Promise.all([
                    this.configService.getSettings(),
                    this.languageService.loadLanguage(),
                    this.checkLocalIfNew()
                ]);
            }).then((result: any) => {
                // this language will be used as a fallback when a translation
                // isn't found in the current language
                this.languageService.defaultLanguage = this.CONFIG.defaultLanguage;
                this.setLanguage(result[1]);
                this.setSettings(result[0]);

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

    getCustomization() {
        if (this.CONFIG.isLocal) {
            return this.getWebadminConfig().toPromise()
                .then((data: any) => {
                    const { companyLink, companyName, copyrightYear } = data;
                    delete data.companyLink;
                    delete data.companyName;
                    delete data.copyrightYear;
                    delete data.footerLinks;
                    const company = {
                        copyrightYear,
                        links: {
                            website: companyLink
                        },
                        name: companyName
                    };
                    this.configService.updateConfig({ ...data, company });
                    return Promise.resolve();
                }).catch(() => {
                    return Promise.resolve();
                });
        }
        return Promise.resolve();
    }

    setLocalInfo(data) {
        const hostProtocol = data.cloudHost.split('://')[0];
        this.CONFIG.cloudHost = (hostProtocol === data.cloudHost) ? `https://${data.cloudHost}` : data.cloudHost;
        this.CONFIG.cloudSystemId = data.cloudSystemId;
        this.CONFIG.localSystemId = data.localSystemId;
    }

    setLanguage(data) {
        // this.languageService.newTranslation = { language: data.ajs.language, json: data.i18n };
        this.languageService.setTranslations(data.language, data);
        this.LANG = this.languageService.translations;
        this.pageService.newLanguage = this.LANG; // during the init of the service LANG is undefined
        this.pageService.pageTitle = this.LANG.pageTitles.default?.();

        this.CONFIG.viewsDir = 'static/lang_' + data.language + '/views/';
    }

    setSettings(data) {
        if (!this.CONFIG.isLocal && Object.keys(data).length > 0) {
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
                    privacy : privacyLink,
                    support : supportLink,
                    website : companyLink
                },
                name: companyName
            };

            const { developersEnabled, feedbackEnabled, integrationStoreEnabled, publicDownloads, publicReleases, cloudStorageEnabled, cloudStorageSize } = data;
            this.CONFIG.cloudCapabilities = {
                developersEnabled,
                feedbackEnabled,
                integrationStore: integrationStoreEnabled,
                publicDownloads,
                publicReleases,
                cloudStorageEnabled,
                cloudStorageSize
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
                items      : integrationFilterItems,
                limitation : integrationFilterLimitation
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

            this.CONFIG.integration.seoPageDesc = data.integrationSeoPageDescription
                .replace('%VMS_NAME%', this.CONFIG.vmsName)
                .replace('%CLOUD_NAME%', this.CONFIG.cloudName);


            // detect preview mode
            if (window.location.href.indexOf('preview') >= 0) {
                this.CONFIG.previewPath = 'preview';
                this.CONFIG.viewsDir = this.CONFIG.previewPath + '/' + this.CONFIG.viewsDir;
            }
        }
        this.CONFIG.dynamicMenus = data?.menus;
        this.CONFIG.docMenuMap = data?.docMenuMap;
        this.CONFIG.licenseTypes = data?.licenseTypes;
    }
}
