import { Component } from '@angular/core';
import { NxConfigService, IConfig } from '../app/src/services/nx-config';
import { NxLanguageProviderService } from '../app/src/services/nx-language-provider';
import '../app/styles/main.scss';
import 'bootstrap';

@Component({
    selector: 'ipvd-app',
    template: '<router-outlet></router-outlet>'
})
export class IpvdComponent {
    CONFIG: IConfig;
    constructor(private config: NxConfigService,
                private language: NxLanguageProviderService
    ) {
        this.CONFIG = this.config.getConfig();

        // @ts-ignore
        this.language.setDefaultLang('en_US');
        // @ts-ignore
        this.language.setTranslations(window.LANG.ajs.language, window.LANG.i18n);

        // @ts-ignore
        this.CONFIG.companyLink = window.SETTINGS.companyLink;
        // @ts-ignore
        this.CONFIG.companyName = window.SETTINGS.companyName;
        // @ts-ignore
        this.CONFIG.copyrightYear = window.SETTINGS.copyrightYear;
        // @ts-ignore
        this.CONFIG.feedbackEnabled = window.SETTINGS.feedbackEnabled;
        // @ts-ignore
        this.CONFIG.footerItems = window.SETTINGS.footerItems;
        // @ts-ignore
        this.CONFIG.integrationFilterItems = window.SETTINGS.integrationFilterItems;
        // @ts-ignore
        this.CONFIG.integrationFilterLimitation = window.SETTINGS.integrationFilterLimitation;
        // @ts-ignore
        this.CONFIG.integrationStoreEnabled = window.SETTINGS.integrationStoreEnabled;
        // @ts-ignore
        this.CONFIG.publicDownloads = window.SETTINGS.publicDownloads;
        // @ts-ignore
        this.CONFIG.publicReleases = window.SETTINGS.publicReleases;
        // @ts-ignore
        this.CONFIG.trafficRelayHost = window.SETTINGS.trafficRelayHost;
        // @ts-ignore
        this.CONFIG.supportLink = window.SETTINGS.supportLink;
        // @ts-ignore
        this.CONFIG.privacyLink = window.SETTINGS.privacyLink;
        // @ts-ignore
        this.CONFIG.cloudName = window.SETTINGS.cloudName;
        // @ts-ignore
        this.CONFIG.vmsName = window.SETTINGS.vmsName;
        // @ts-ignore
        this.CONFIG.ipvd.sortSupportedDevicesByPopularity = window.SETTINGS.sortSupportedDevicesByPopularity;
        // @ts-ignore
        this.CONFIG.ipvd.supportedResolutions = window.SETTINGS.supportedResolutions;
        // @ts-ignore
        this.CONFIG.ipvd.supportedHardwareTypes = window.SETTINGS.supportedHardwareTypes;
        // @ts-ignore
        this.CONFIG.ipvd.searchTags = window.SETTINGS.searchTags;
        // @ts-ignore
        this.CONFIG.ipvd.vendorsShown = parseInt(window.SETTINGS.vendorsShown);
        // @ts-ignore
        this.CONFIG.pushConfig = window.SETTINGS.pushConfig;
        // @ts-ignore
        this.CONFIG.viewsDir = 'static/lang_' + window.LANG.ajs.language + '/views/';
        // @ts-ignore
        // this.CONFIG.viewsDirCommon = 'static/lang_' + window.LANG.ajs.language + '/web_common/views/';
    }
}
