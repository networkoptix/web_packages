import { Injectable }                from '@angular/core';
import { IConfig, NxConfigService }  from './nx-config';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxSystemRole }              from './system.service';
import { LanguageI18NStaticTypes }   from '../../language_i18n_static_types';
import { NxPageService }             from './page.service';
import { HttpClient }                from '@angular/common/http';
import { Location }                  from '@angular/common';

import {DefaultUrlSerializer, Router, UrlTree} from "@angular/router";

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
        private http: HttpClient,
        private location: Location
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
            : Promise.resolve({})
    }

    load(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            return Promise.all([
                this.configService.getSettings(),
                this.languageService.loadLanguage(),
                this.checkLocalIfNew()
            ]).then((result: any) => {
                // this language will be used as a fallback when a translation
                // isn't found in the current language
                this.languageService.defaultLanguage = 'en_US';
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
                this.languageService.defaultLanguage = 'en_US';
                resolve(true);
            });
        });
    }

    setLocalInfo(data) {
        const hostProtocol = data.cloudHost.split('://')[0];
        this.CONFIG.cloudHost = (hostProtocol === data.cloudHost) ? `https://${data.cloudHost}` : data.cloudHost;
        this.CONFIG.cloudSystemId = data.cloudSystemId;
        this.CONFIG.localSystemId = data.localSystemId;
    }

    setLanguage(data) {
        // this.languageService.newTranslation = { language: data.ajs.language, json: data.i18n };
        this.languageService.setTranslations(data.ajs.language, data.i18n);
        this.LANG = this.languageService.translations;
        this.pageService.newLanguage = this.LANG; // during the init of the service LANG is undefined
        this.pageService.pageTitle = this.LANG.pageTitles.default;

        this.CONFIG.viewsDir = 'static/lang_' + data.ajs.language + '/views/';
    }

    setSettings(data) {
        if (Object.keys(data).length > 0) {
            // extend CONFIG ... ugly // @ts-ignore ... no implementation for // @ts-ignore-start/end
            // This was done every time a system is created. Its only need once
            this.CONFIG.accessRoles.predefinedRoles.forEach((option: NxSystemRole) => {
                if (option.permissions) {
                    option.permissions = option.permissions.split('|').sort().join('|');
                }
            });

            // @ts-ignore
            const {companyLink, companyName, copyrightYear, privacyLink, supportLink} = data;
            this.CONFIG.company = {
                copyrightYear,
                links: {
                    privacy: privacyLink,
                    support: supportLink,
                    website: companyLink
                },
                name: companyName
            };

            const {feedbackEnabled, integrationStoreEnabled, healthMonitor, publicDownloads, publicReleases, cloudStorageEnabled, cloudStorageSize} = data;
            this.CONFIG.cloudCapabilities = {
                feedbackEnabled,
                healthMonitor,
                integrationStore: integrationStoreEnabled,
                publicDownloads,
                publicReleases,
                cloudStorageEnabled,
                cloudStorageSize
            };

            const {searchTags, sortSupportedDevicesByPopularity, supportedHardwareTypes, supportedResolutions, vendorsShown} = data;
            this.CONFIG.ipvd = Object.assign({}, this.CONFIG.ipvd, {
                searchTags,
                sortSupportedDevicesByPopularity,
                supportedHardwareTypes,
                supportedResolutions,
                vendorsShown: parseInt(vendorsShown)
            });

            const {integrationFilterItems, integrationFilterLimitation} = data;
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
            this.CONFIG.footerItems = data.footerItems;
            this.CONFIG.googleTagManagerId = data.googleTagManagerId;
            this.CONFIG.pushConfig = data.pushConfig;
            this.CONFIG.testedOperatingSystems = data.testedOperatingSystems;
            this.CONFIG.trafficRelayHost = data.trafficRelayHost;
            this.CONFIG.vmsName = data.vmsName;
            this.CONFIG.dynamicMenus = data.menus;

            // detect preview mode
            if (window.location.href.indexOf('preview') >= 0) {
                this.CONFIG.previewPath = 'preview';
                this.CONFIG.viewsDir = this.CONFIG.previewPath + '/' + this.CONFIG.viewsDir;
            }
        } else {
            // Todo: Clean up once there's a way to determine cloud portal vs webadmin.
            this.CONFIG.isLocal = true;
            this.CONFIG.menus.systemSettings.baseUrl = '/settings';
            this.CONFIG.redirect.authorised = '/settings';
            this.CONFIG.credentialsValidation.emailRegex = '.*';
            this.CONFIG.viewsDir = 'static/views/';
            // @ts-ignore
            this.CONFIG.commonViewsDir = 'web_common/views/';
        }
    }
}
