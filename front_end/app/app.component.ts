import { Location }                                from '@angular/common';
import { Component, HostListener, Inject }         from '@angular/core';
import { CookieService }                           from 'ngx-cookie-service';
import { DeviceDetectorService }                   from 'ngx-device-detector';
import { ActivationStart, Event, Router }          from '@angular/router';
import { filter, debounceTime, timeout, finalize } from 'rxjs/operators';
import { WINDOW }                                  from './src/services/window-provider';
import { NxLanguageProviderService }               from './src/services/nx-language-provider';
import { NxConfigService }                         from './src/services/nx-config/nx-config.service';
import { NxApplyService }                          from './src/services/apply.service';
import { NxRibbonService }                         from './src/components/ribbon/ribbon.service';
import { NxAppStateService }                       from './src/services/nx-app-state.service';
import { fromEvent, Subscription }                 from 'rxjs';
import { NxScrollMechanicsService }                from './src/services/scroll-mechanics.service';
import { NxUriService }                            from './src/services/uri.service';
import { NxPageService }                           from './src/services/page.service';
import { NxSystemRole }                            from './src/services/system.service';
import { IConfig } from './src/services/nx-config/config-types';
import { LanguageI18NStaticTypes } from './language_i18n_static_types';

@Component({
    selector: 'nx-app',
    template: `
        <div class="outerContainer" *ngIf="appStateService.ready">
            <div class="headerContainer">
                <nx-header></nx-header>
                <nx-ribbon></nx-ribbon>
            </div>

            <div class="mainContainer" nxScrollHelper>
                <router-outlet></router-outlet>
                <div ng-view ng-model-options="{ updateOn: 'blur' }"></div>
            </div>
        </div>
        <nx-pre-loader type="page" *ngIf="!appStateService.ready"></nx-pre-loader>
        <app-toasts aria-live="polite" aria-atomic="true"></app-toasts>
    `
})

export class AppComponent {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    deviceInfo: any;
    allowedDevices: {};
    isInIframe: boolean;

    eventSubscription: Subscription;

    constructor(configService: NxConfigService,
                languageService: NxLanguageProviderService,
                private cookieService: CookieService,
                private deviceService: DeviceDetectorService,
                private location: Location,
                private applyService: NxApplyService,
                private appStateService: NxAppStateService,
                private scrollMechanicsService: NxScrollMechanicsService,
                private router: Router,
                private ribbonService: NxRibbonService,
                private uriService: NxUriService,
                private pageService: NxPageService,
                @Inject(WINDOW) private window: Window,
    ) {

        this.CONFIG = configService.getConfig();

        // this language will be used as a fallback when a translation
        // isn't found in the current language
        languageService.setDefaultLang('en_US');

        // @ts-ignore
        languageService.setTranslations(window.LANG.ajs.language, window.LANG.i18n);
        this.LANG = languageService.getTranslations();
        this.pageService.setLanguage(this.LANG); // during the init of the service LANG is undefined
        // @ts-ignore
        this.pageService.setPageTitle(this.LANG.pageTitles.default);

        // Allows 3 seconds for auth query param to be detected and set appstate.ready to false.
        // This makes sure only the preloader is shown before the page is refreshed to a logged in state.
        // After 3 seconds we unsubscribe to make sure we don't change the ready state while the app is already loaded
        const authUriSub = this.uriService.getURI()
            .pipe(timeout(3000), finalize(() => authUriSub.unsubscribe()))
            .subscribe(params => {
                if (params.auth) {
                    authUriSub.unsubscribe();
                }
                this.appStateService.ready = !params.auth;
            }, () => {});

        this.scrollMechanicsService.setWindowSize(window.innerHeight, window.innerWidth);

        // TODO: Componentize this
        this.allowedDevices = {
            windows: {
                ie     : 10,
                safari : 10,
                chrome : 64,
                firefox: 60
            },
            mac: {
                safari : 10,
                chrome : 64,
                firefox: 60
            },
            linux: {
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

        // extend CONFIG ... arghhh ugly // @ts-ignore ... no implementation for // @ts-ignore-start/end
        // This was done every time a system is created. Its only need once
        this.CONFIG.accessRoles.predefinedRoles.forEach((option: NxSystemRole) => {
            if (option.permissions) {
                option.permissions = option.permissions.split('|').sort().join('|');
            }
        });

        // @ts-ignore
        const { companyLink, companyName, copyrightYear, privacyLink, supportLink } = window.SETTINGS;
        this.CONFIG.company = {
            copyrightYear,
            links: {
                privacy: privacyLink,
                support: supportLink,
                website: companyLink,
            },
            name: companyName
        };
        // @ts-ignore
        const { cloudMerge, cloudStorageEnabled, feedbackEnabled, integrationStore, healthMonitor, publicDownloads, publicReleases } = window.SETTINGS;
        this.CONFIG.capabilities = {
            cloudMerge,
            cloudStorageEnabled,
            feedbackEnabled,
            healthMonitor,
            integrationStore,
            publicDownloads,
            publicReleases
        };
        // @ts-ignore
        const { searchTags, sortSupportedDevicesByPopularity, supportedHardwareTypes, supportedResolutions, vendorsShown } = window.SETTINGS;
        this.CONFIG.ipvd = Object.assign({}, this.CONFIG.ipvd, {
            searchTags,
            sortSupportedDevicesByPopularity,
            supportedHardwareTypes,
            supportedResolutions,
            vendorsShown: parseInt(vendorsShown)
        });
        // @ts-ignore
        const { integrationFilterItems, integrationFilterLimitation } = window.SETTINGS;
        this.CONFIG.integration.filter = {
            items     : integrationFilterItems,
            limitation: integrationFilterLimitation
        };
        // @ts-ignore
        if (window.SETTINGS.appTypesForPlatform) {
            // @ts-ignore
            Object.entries(window.SETTINGS.appTypesForPlatform).forEach(([platform, appTypes]: [string, any]) => {
                if (platform in this.CONFIG.downloads.groups && appTypes) {
                    this.CONFIG.downloads.groups[platform].appTypes = appTypes;
                }
            });
        }
        // @ts-ignore
        this.CONFIG.cloudName = window.SETTINGS.cloudName;
        // @ts-ignore
        this.CONFIG.footerItems = window.SETTINGS.footerItems;
        // @ts-ignore
        this.CONFIG.googleTagManagerId = window.SETTINGS.googleTagManagerId;
        // @ts-ignore
        this.CONFIG.pushConfig = window.SETTINGS.pushConfig;
        // @ts-ignore
        this.CONFIG.testedOperatingSystems = window.SETTINGS.testedOperatingSystems;
        // @ts-ignore
        this.CONFIG.trafficRelayHost = window.SETTINGS.trafficRelayHost;
        // @ts-ignore
        this.CONFIG.vmsName = window.SETTINGS.vmsName;
        // @ts-ignore
        this.CONFIG.viewsDir = 'static/lang_' + window.LANG.ajs.language + '/views/';
        // @ts-ignore
        this.CONFIG.viewsDirCommon = 'static/lang_' + window.LANG.ajs.language + '/web_common/views/';
        // detect preview mode
        if (window.location.href.indexOf('preview') >= 0) {
            this.CONFIG.previewPath = 'preview';
            this.CONFIG.viewsDir = this.CONFIG.previewPath + '/' + this.CONFIG.viewsDir;
        }

        // (Smart check) Check if page is displayed inside an iframe
        // this.isInIframe = (window.location !== window.parent.location);

        // Route check if page is displayed inside an iframe
        this.isInIframe = (window.location.pathname.indexOf('/embed') === 0);
        if (this.isInIframe) {
            this.appStateService.setHeaderVisibility(false);
            this.appStateService.setFooterVisibility(false);
        }

        // Updates query params for components without routes.
        this.router.events.pipe(
            filter((event: Event) => event instanceof ActivationStart)
        ).subscribe(({ snapshot: { queryParams } }: ActivationStart) => {
            this.uriService.queryParams = queryParams;
        });

        fromEvent(window, 'resize').pipe(debounceTime(100)).subscribe((event: any) => {
            this.scrollMechanicsService.setWindowSize(event.target.innerHeight, event.target.innerWidth);
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
}
