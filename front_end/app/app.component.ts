import { Location }                  from '@angular/common';
import { Component, HostListener, Inject } from '@angular/core';
import { CookieService }             from 'ngx-cookie-service';
import { DeviceDetectorService }     from 'ngx-device-detector';
import { Title }                     from '@angular/platform-browser';
import { ActivationStart, Event, Router } from '@angular/router';
import { filter }                    from 'rxjs/operators';
import { WINDOW }                    from './src/services/window-provider';
import { NxLanguageProviderService } from './src/services/nx-language-provider';
import { NxConfigService }           from './src/services/nx-config';
import { NxApplyService }            from './src/services/apply.service';
import { NxQueryParamService } from './src/services/query-param.service';

@Component({
    selector: 'nx-app',
    template: `
        <router-outlet></router-outlet>
        <div ng-view="" ng-model-options="{ updateOn: 'blur' }"></div>
        <app-toasts aria-live="polite" aria-atomic="true"></app-toasts>
    `
})

export class AppComponent {
    CONFIG: any;
    deviceInfo: any;
    allowedDevices: {};
    hlsIsSupported: boolean;

    constructor(private cookieService: CookieService,
                private deviceService: DeviceDetectorService,
                private location: Location,
                private titleService: Title,
                private config: NxConfigService,
                private language: NxLanguageProviderService,
                private applyService: NxApplyService,
                private queryParamService: NxQueryParamService,
                private router: Router,
                @Inject(WINDOW) private window: Window) {

        this.CONFIG = this.config.getConfig();

        // TODO: Componentize this
        this.allowedDevices = {
            windows: {
                ie     : 10,
                safari : 10,
                chrome : 64,
                firefox: 60
            },
            mac    : {
                safari : 10,
                chrome : 64,
                firefox: 60
            },
            linux  : {
                chrome : 64,
                firefox: 60
            }
        };

        this.deviceInfo = this.deviceService.getDeviceInfo();
        let allowedDevice = this.allowedDevices[this.deviceInfo.os.toLowerCase()];

        // Special case for Kyle's robot tests
        // ... device detector doesn't detect it correctly
        if (this.deviceInfo.userAgent.indexOf('HeadlessChrome') > -1) {
            allowedDevice = undefined;
        }

        if (allowedDevice !== undefined) {
            const allowedVersion = allowedDevice[this.deviceInfo.browser.toLowerCase()] || 0;
            const majorVersion = this.deviceInfo.browser_version.split('.')[0];

            if (majorVersion < allowedVersion) {
                // redirect
                this.location.go('/browser');
            }
        } // else -> unknown platform or device ... cross fingers and hope for the best

        // this language will be used as a fallback when a translation
        // isn't found in the current language
        this.language.setDefaultLang('en_US');

        // @ts-ignore
        this.language.setTranslations(window.LANG.ajs.language, window.LANG.i18n);

        // extend CONFIG ... arghhh ugly // @ts-ignore ... no implementation for // @ts-ignore-start/end
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
        if (window.SETTINGS.cloudMerge) {
            // @ts-ignore
            this.CONFIG.cloudMerge = window.SETTINGS.cloudMerge;
        }
        // @ts-ignore
        this.CONFIG.viewsDir = 'static/lang_' + window.LANG.ajs.language + '/views/';
        // @ts-ignore
        this.CONFIG.viewsDirCommon = 'static/lang_' + window.LANG.ajs.language + '/web_common/views/';

        // detect preview mode
        if (window.location.href.indexOf('preview') >= 0) {
            this.CONFIG.previewPath = 'preview';
            this.CONFIG.viewsDir = this.CONFIG.previewPath + '/' + this.CONFIG.viewsDir;
        }

        this.CONFIG.showHeaderAndFooter = true;

        // Updates query params for components without routes.
        this.router.events.pipe(
            filter((event: Event) => event instanceof ActivationStart)
        ).subscribe(({ snapshot: { queryParams } }: ActivationStart) => {
            this.queryParamService.queryParams = queryParams;
        });
    }

    // Todo: Revisit using this when the hybrid app is killed.
    @HostListener('window:popstate')
    windowListener() {
        if (this.applyService.locked) {
            window.history.go(1);
            this.applyService.showDialog().catch(() => {});
        }
    }

    public setTitle(newTitle: string) {
        this.titleService.setTitle(newTitle);
    }
}
