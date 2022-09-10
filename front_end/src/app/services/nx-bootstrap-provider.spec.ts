import { HttpClient } from '@angular/common/http';
import { waitForAsync, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';

import {
    getCloudSettings,
    getLocalSettings,
    getModuleInformation
} from '@app/_mocks/getSettings.mock';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { WINDOW } from '@services/window-provider';

describe('Bootstrap Provider', () => {
    let bootstrapService: NxBootstrapProvider;

    const configMock = {
        getConfig: () => nxConfig,
        updateConfigUsingOverrides: () => { },
        getSettings: []
    };

    const translateMock = {
        translations: {
            system: {
                status: {
                    unavailable: ''
                }
            },
            pageTitles: {
                // systems: () => "Systems"
            }
        }
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                NxBootstrapProvider,
                { provide: NxConfigService, useValue: configMock },
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: NxPageService, useValue: {} },
                { provide: HttpClient, useValue: {} },
                MockProvider(WINDOW),
            ]
        });
        bootstrapService = TestBed.inject(NxBootstrapProvider);
    }));

    it('should create the service', () => {
        expect(bootstrapService).toBeTruthy();
    });

    it('should call getConfig', () => {
        expect(configMock.getConfig).toBeTruthy();
    });

    it('should set local settings', () => {
        const resultSettings = getLocalSettings();
        const CONFIG = configMock.getConfig();

        Object.defineProperty(
            bootstrapService,
            'environment',
            { value: { ...bootstrapService.environment, isLocal: true } }
        );
        bootstrapService.setSettings(resultSettings);

        expect(CONFIG.company.copyrightYear).toBe(resultSettings.description.copyrightYear);
        expect(CONFIG.company.links.website).toBe(resultSettings.description.contact.supportAddress);
        expect(CONFIG.company.name).toBe(resultSettings.description.companyName);
        expect(CONFIG.cloudName).toBe(resultSettings.description.cloudName);
        expect(CONFIG.vmsName).toBe(resultSettings.description.vmsName);
        expect(CONFIG.trialLicenseKey).toBe(resultSettings.description.desktop.trialLicenseKey);
        expect(CONFIG.defaultLanguage).toBe(resultSettings.description.defaultLanguage);
        expect(CONFIG.licenseTypes).toEqual(resultSettings.webadminConfig.licenseTypes);
        expect(CONFIG.supportedLanguages).toEqual(resultSettings.supportedLanguages);
    });

    it('should set local settings from "moduleInformation"', () => {
        const resultSettings = getModuleInformation();
        const CONFIG = configMock.getConfig();

        Object.defineProperty(
            bootstrapService,
            'environment',
            { value: { ...bootstrapService.environment, isLocal: true } }
        );
        bootstrapService.setLocalInfo(resultSettings);

        const hostProtocol = resultSettings.cloudHost.split('://')[0];
        const cloudHost = (hostProtocol === resultSettings.cloudHost) ? `https://${resultSettings.cloudHost}` : resultSettings.cloudHost;
        expect(CONFIG.cloudHost).toBe(cloudHost);
        expect(CONFIG.cloudSystemId).toBe(resultSettings.cloudSystemId);
        expect(CONFIG.localSystemId).toBe(resultSettings.localSystemId);
        expect(CONFIG.system.name).toBe(resultSettings.systemName || resultSettings.name);
        expect(CONFIG.localServerId).toBe(resultSettings.id);
    });

    it('should set cloud settings', () => {
        const resultSettings = getCloudSettings();
        const CONFIG = configMock.getConfig();

        Object.defineProperty(
            bootstrapService,
            'environment',
            { value: { ...bootstrapService.environment, isLocal: false } }
        );
        bootstrapService.setSettings(resultSettings);

        expect(CONFIG.company.name).toBe(resultSettings.companyName);
        expect(CONFIG.company.copyrightYear).toBe(resultSettings.copyrightYear);
        expect(CONFIG.company.links.privacy).toBe(resultSettings.privacyLink);
        expect(CONFIG.company.links.support).toBe(resultSettings.supportLink);
        expect(CONFIG.company.links.website).toBe(resultSettings.companyLink);

        expect(CONFIG.cloudCapabilities.developersEnabled).toBe(resultSettings.developersEnabled);
        expect(CONFIG.cloudCapabilities.feedbackEnabled).toBe(resultSettings.feedbackEnabled);
        expect(CONFIG.cloudCapabilities.integrationStore).toBe(resultSettings.integrationStoreEnabled);
        expect(CONFIG.cloudCapabilities.publicDownloads).toBe(resultSettings.publicDownloads);
        expect(CONFIG.cloudCapabilities.publicReleases).toBe(resultSettings.publicReleases);
        expect(CONFIG.cloudCapabilities.cloudStorageEnabled).toBe(resultSettings.cloudStorageEnabled);
        expect(+CONFIG.cloudCapabilities.cloudStorageSize).toBe(+resultSettings.cloudStorageSize);

        expect(CONFIG.integration.filter.items).toEqual(resultSettings.integrationFilterItems);
        expect(+CONFIG.integration.filter.limitation).toBe(+resultSettings.integrationFilterLimitation);

        expect(CONFIG.cloudName).toBe(resultSettings.cloudName);
        expect(CONFIG.googleTagManagerId).toBe(resultSettings.googleTagManagerId);
        expect(CONFIG.pushConfig).toEqual(resultSettings.pushConfig);
        expect(CONFIG.testedOperatingSystems).toEqual(resultSettings.testedOperatingSystems);
        expect(CONFIG.trafficRelayHost).toBe(resultSettings.trafficRelayHost);
        expect(CONFIG.trialLicenseKey).toBe(resultSettings.trialLicenseKey);
        expect(CONFIG.vmsName).toBe(resultSettings.vmsName);

        expect(CONFIG.integration.seoPageDesc).toBe(resultSettings.integrationSeoPageDescription);

        expect(CONFIG.docMenuMap).toBe(resultSettings.docMenuMap);
        expect(CONFIG.licenseTypes).toBe(resultSettings.licenseTypes);
    });
});
