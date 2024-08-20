import { InjectionToken } from '@angular/core';

import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { LOGIN_STATE } from '@services/session.service.types';
import { Role } from '@services/system-user.types';
import { InterceptorManager } from '@utils/interceptor-manager';

import { ThemeColors } from './base-config';
import { nxConfig } from './config';
import { IConfig } from './config-types';

export class DynamicConfig {
    static async bootstrap(): Promise<{
        provide: typeof DynamicConfig;
        useValue: Omit<DynamicConfig, 'mapPropertiesToConfig'>;
    }> {
        if (environment.testing) {
            return { provide: DynamicConfig, useValue: { config: nxConfig } };
        }
        const preloadedAccount = await DynamicConfig.getAccount();
        const [data, preloadedTranslation, customizationColors] = await Promise.allSettled([
            DynamicConfig.getData(),
            DynamicConfig.getTranslation(),
            DynamicConfig.getCustomizationColors(),
        ]).then(res => res.map(res => res.status === 'fulfilled' && res.value));

        // Need to find out why featureFlag override not working for this flag
        // data.featureFlags.useAuthenticationInterceptor = true;

        if (data?.featureFlags?.useAuthenticationInterceptor) {
            await DynamicConfig.registerAuthenticationInterceptor(
                preloadedAccount?.accessToken,
                data.trafficRelayHost,
            );
        }

        return {
            provide: DynamicConfig,
            useValue: new DynamicConfig({
                ...data,
                preloadedAccount,
                preloadedTranslation,
                themeColors: customizationColors,
            }),
        };
    }

    static async registerAuthenticationInterceptor(
        accessToken: string,
        trafficRelayHost: string,
    ): Promise<void> {
        InterceptorManager.getInstance(accessToken, trafficRelayHost).enabled = true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async getData(): Promise<any> {
        if (environment.isLocal) {
            const [
                webadminConfig,
                description,
                { default: defaultLanguage, supported: supportedLanguages },
            ] = await Promise.all(
                [
                    fetch('/static/customization/webadmin_config.json'),
                    fetch('/static/customization/description.json'),
                    fetch('/static/supported_languages.json'),
                ].map(res => res.then(res => res.json())),
            );

            return {
                defaultLanguage,
                supportedLanguages,
                webadminConfig,
                description,
            };
        } else {
            return fetch('/api/utils/settings').then(res => res.json());
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static async getAccount(): Promise<any> {
        const getCurrentAccount = (): Promise<unknown> =>
            fetch(environment.isLocal ? '/rest/v1/login/sessions/current' : '/api/account')
                .then(res => res.json())
                .then(result =>
                    result.resultCode ||
                    (environment.isLocal ? !result?.token : !result?.is_authenticated)
                        ? null
                        : result,
                )
                .catch(() => null);

        const loginCode = (code: string): Promise<unknown> =>
            (environment.isLocal
                ? Promise.resolve()
                : fetch('/api/account/loginCode', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code }),
                  })
            )
                .then(res => res.json())
                .then(account => {
                    const searchParams = new URLSearchParams(location.search);
                    searchParams.delete('code');
                    const path =
                        location.protocol +
                        '//' +
                        location.host +
                        location.pathname +
                        '?' +
                        searchParams.toString();
                    history.replaceState({ path }, '', path);
                    return account;
                })
                .catch(() => null);

        const current = await getCurrentAccount();
        if (environment.isLocal) {
            localStorage.setItem(
                'ngx-webstorage|loginstate',
                `"${current ? LOGIN_STATE.AUTHORIZED : LOGIN_STATE.UNAUTHORIZED}"`,
            );
        }

        if (current) {
            return current;
        }

        const code = new URLSearchParams(location.search).get('code');
        if (code) {
            return loginCode(code);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static getTranslation(): Promise<any> {
        return fetch(
            environment.isLocal
                ? `/static/lang_${nxConfig.defaultLanguage}/language_compiled.json`
                : '/api/utils/language',
        )
            .then(res => res.json())
            .catch(() => null);
    }

    static getCustomizationColors(): Promise<ThemeColors> {
        return fetch('/api/utils/theme')
            .then(res => res.json())
            .catch(() => ({}));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private mapPropertiesToConfig(data: any): IConfig {
        nxConfig.preloadedAccount = data.preloadedAccount;
        nxConfig.preloadedTranslation = data.preloadedTranslation;
        nxConfig.themeColors = { ...nxConfig.themeColors, ...data.themeColors };
        if (environment.isLocal) {
            // weird timing issue occur when using method updateConfig. Re-factored to explicit assignment. (TT)
            const { defaultLanguage, description, webadminConfig, supportedLanguages } = data;
            nxConfig.dynamicMenus = webadminConfig.dynamicMenus?.reduce((menu, { name, nodes }) => {
                menu[name] = {
                    title: name,
                    description: '',
                    nodes,
                };
                return menu;
            }, {});
            nxConfig.cloudName = description.cloudName;
            nxConfig.vmsName = description.vmsName;
            nxConfig.company = {
                copyrightYear: description.copyrightYear,
                links: {
                    website: description.contact.companyUrl,
                    support: description.contact.supportAddress,
                },
                name: description.companyName,
            };
            nxConfig.licenseTypes = webadminConfig.licenseTypes;
            // Fallback in case licenseTypes from webadmin_config.json is made a string in the cms
            if (typeof webadminConfig.licenseTypes === 'string') {
                nxConfig.licenseTypes = JSON.parse(webadminConfig.licenseTypes);
            }
            nxConfig.trialLicenseKey = description.desktop.trialLicenseKey;

            nxConfig.defaultLanguage =
                defaultLanguage || description.defaultLanguage || nxConfig.defaultLanguage;
            nxConfig.supportedLanguages = supportedLanguages.length
                ? supportedLanguages
                : [nxConfig.defaultLanguage];

            nxConfig.clientProtocol = description.uriProtocol;
        } else if (!environment.isLocal && Object.keys(data).length > 0) {
            // extend CONFIG ... ugly // @ts-ignore ... no implementation for // @ts-ignore-start/end
            // This was done every time a system is created. Its only need once
            nxConfig.accessRoles.predefinedRoles.forEach((option: Role) => {
                if (option.permissions) {
                    option.permissions = option.permissions.split('|').sort().join('|');
                }
            });

            const {
                clientProtocol,
                companyLink,
                companyName,
                copyrightYear,
                privacyLink,
                supportLink,
                mobileLinks,
                customization,
                licenseServer,
            } = data;
            nxConfig.licenseServer = licenseServer;
            nxConfig.customization = customization;
            nxConfig.company = {
                copyrightYear,
                links: {
                    privacy: privacyLink,
                    support: supportLink,
                    website: companyLink,
                },
                name: companyName,
            };
            nxConfig.mobileLinks = mobileLinks;
            nxConfig.clientProtocol = clientProtocol;

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
                featureFlags = {},
            } = data;
            nxConfig.cloudCapabilities = {
                developersEnabled,
                feedbackEnabled,
                integrationStore: integrationStoreEnabled,
                publicDownloads,
                publicReleases,
                cloudStorageEnabled,
                cloudStorageSize,
                customClientsEnabled,
                alexaIntegrationEnabled: featureFlags.alexaIntegration && alexaIntegrationEnabled,
                bookmarksEnabled: featureFlags.bookmarks && bookmarksEnabled,
            };

            const {
                searchTags,
                showAnalyticsEvents,
                sortSupportedDevicesByPopularity,
                supportedHardwareTypes,
                supportedResolutions,
                vendorsShown,
            } = data;
            nxConfig.ipvd = Object.assign({}, nxConfig.ipvd, {
                searchTags,
                showAnalyticsEvents,
                sortSupportedDevicesByPopularity,
                supportedHardwareTypes,
                supportedResolutions,
                vendorsShown: parseInt(vendorsShown),
            });

            const { integrationFilterItems, integrationFilterLimitation } = data;
            nxConfig.integration.filter = {
                items: integrationFilterItems,
                limitation: integrationFilterLimitation,
            };

            if (data.appTypesForPlatform) {
                Object.entries(data.appTypesForPlatform).forEach(
                    ([platform, appTypes]: [string, unknown]) => {
                        if (platform in nxConfig.downloads.groups && appTypes) {
                            nxConfig.downloads.groups[platform].appTypes = appTypes;
                        }

                        const overridePlatformName = data.downloadsPlatformNameOverride[platform];

                        if (overridePlatformName) {
                            staticLang.downloads.groups[platform] = {
                                label: overridePlatformName,
                                shortLabel: overridePlatformName,
                            };
                        }
                    },
                );
            }

            nxConfig.cloudName = data.cloudName;
            nxConfig.googleTagManagerId = data.googleTagManagerId;
            nxConfig.cloudMonitoring.fullStory = data.fullStory;
            nxConfig.pushConfig = data.pushConfig;
            nxConfig.testedOperatingSystems = data.testedOperatingSystems;
            nxConfig.trafficRelayHost = data.trafficRelayHost;
            nxConfig.trialLicenseKey = data.trialLicenseKey;
            nxConfig.vmsName = data.vmsName;
            if (data.themeConfig) {
                nxConfig.themeConfig = data.themeConfig;
            }
            nxConfig.integration.seoPageDesc = data.integrationSeoPageDescription;
            nxConfig.landing.description = data.landingDescription;

            // detect preview mode
            if (location.href.includes('preview')) {
                nxConfig.previewPath = 'preview';
                nxConfig.viewsDir = nxConfig.previewPath + '/' + nxConfig.viewsDir;
            }
            nxConfig.docMenuMap = data?.docMenuMap;
            nxConfig.licenseTypes = data?.licenseTypes;

            if (featureFlags.newHeader) {
                nxConfig.headerHeight = 98; // Is the current height of the header (40px + 58px)
            }
            nxConfig.dynamicMenus = data?.menus;

            Object.assign(nxConfig.featureFlags, featureFlags);
        }
        return nxConfig;
    }

    constructor(dynamicProperties: unknown) {
        this.mapPropertiesToConfig(dynamicProperties);
    }

    public get config(): IConfig {
        return nxConfig;
    }
}

export const APP_CONFIG = new InjectionToken<DynamicConfig>('dynamic-config');
