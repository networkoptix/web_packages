import {
    Component,
    HostListener,
    Inject,
    ViewEncapsulation,
    ViewChild,
    ElementRef,
} from '@angular/core';
import {
    ActivationEnd,
    ActivationStart,
    Event,
    GuardsCheckEnd,
    GuardsCheckStart,
    Router,
} from '@angular/router';
import * as FullStory from '@fullstory/browser';
import LogRocket from 'logrocket';
import { CookieService } from 'ngx-cookie-service';
import { DeviceDetectorService } from 'ngx-device-detector';
import type { DeviceInfo } from 'ngx-device-detector';
import { LocalStorageService } from 'ngx-webstorage';
import { fromEvent } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { SystemGuard } from '@guards/systemGuard';
import { NxAccountService } from '@services/account.service';
import { NxApplyService } from '@services/apply.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxThemeService } from '@services/theme.service';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';

require('what-input');

@Component({
    selector: 'nx-app',
    template: `
        <div *ngIf="!reauthorizing" class="headerContainer" (resize)="headerResize($event)">
            <nx-header *ngIf="
                (appStateService.ready || environment.isLocal) &&
                !CONFIG.browserNotSupported
            "></nx-header>
            <nx-ribbon></nx-ribbon>
        </div>
        <div
            class="outerContainer"
            *ngIf="appStateService.ready || reauthorizing"
            [ngStyle]="{ 'height': appStateService.appContainerHeight }"
        >
            <div
                class="mainContainer"
                [ngClass]="{ altMainBackground: appStateService.altBackground }"
                nxScrollHelper
                cdkScrollable
                #mainContainer
            >
                <nx-cookie-banner></nx-cookie-banner>
                <router-outlet></router-outlet>
            </div>
        </div>
        <ng-container *ngIf="!reauthorizing">
            <nx-overlay-modal *ngIf="appStateService.ready && environment.isLocal"></nx-overlay-modal>
            <nx-pre-loader
                type="page"
                *ngIf="(!appStateService.ready && !newSystem) || loading"
            ></nx-pre-loader>
            <app-toasts aria-live="polite" aria-atomic="true"></app-toasts>
            <!-- test component - REMOVE AFTER TESTING -->
            <div style="position: absolute; bottom : 20px; left : 20px; z-index : 99999;">
                <nx-theme-switcher-component layout="test"></nx-theme-switcher-component>
            </div>
            <!-- end test component - REMOVE AFTER TESTING -->
        </ng-container>`,
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None
})

export class AppComponent {
    deviceInfo: DeviceInfo;
    browserBlacklist: Record<string, number>;
    // isInIframe: boolean;
    newSystem: boolean;
    loading: boolean;
    reauthorizing: boolean;
    headerHeight: number;

    CONFIG: IConfig;
    readonly environment = environment;

    @ViewChild('mainContainer') mainContainer: ElementRef<HTMLDivElement>;

    constructor(
        bootstrapProvider: NxBootstrapProvider,
        configService: NxConfigService,
        public appStateService: NxAppStateService,
        public systemGuard: SystemGuard,
        private cookieService: CookieService,
        private deviceService: DeviceDetectorService,
        private applyService: NxApplyService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private router: Router,
        private uriService: NxUriService,
        private dialogsService: NxDialogsService,
        private localStorageService: LocalStorageService,
        private accountService: NxAccountService,
        private themeService: NxThemeService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.reauthorizing = this.window.location.href.includes('cloud-authorize');
        this.CONFIG = configService.getConfig();

        if (this.CONFIG.featureFlags.themesEnabled) {
            this.themeService.initTheme();
        }

        const url = new URL(this.window.location.href.replace('#/', ''));
        const auth = url.searchParams.get('auth');
        const code = url.searchParams.get('code');
        if (!this.environment.isLocal && auth) {
            this.accountService.handleAuthKeyLogin(auth);
        } else if (
            !this.environment.isLocal &&
            code &&
            !url.toString().includes('cloud-authorize')
        ) {
            this.accountService.handleCodeLogin(code);
        } else {
            this.appStateService.ready = true;
        }

        /* No real need to update often unless some browser have major upgrade
         * and we don't want to support previous releases.
         * https://networkoptix.atlassian.net/wiki/spaces/SD/pages/771031360/Supported+OS+and+versions
         *
         * IE is here just for reference
         * Angular will not make it through here as IE and early Edge (UA string 'Edge')
         * are not supported at all ... see index.html
         *
         * Device detector will report mobile Edge as 'ms-edge' (actual UA string 'EdgA|EdgiOS')
         * and desktop Edge as 'ms-edge-chromium'(UA string 'Edg')
         * TODO: Need to check it once device detector is upgraded to match Angular version
         */
        this.browserBlacklist = {
            ie: 9999,
            'ms-edge': 84,
            'ms-edge-chromium': 84,
            safari: 12,
            chrome: 76,
            firefox: 72,
            opera: 70
        };

        this.deviceInfo = this.deviceService.getDeviceInfo();
        let browserMatchVersion =
            this.browserBlacklist[this.deviceInfo.browser.toLowerCase()] || 0;

        // Special case for Kyle's robot tests
        // ... device detector doesn't detect it correctly
        if (this.deviceInfo.userAgent.includes('HeadlessChrome')) {
            browserMatchVersion = undefined;
        }

        if (browserMatchVersion !== undefined) {
            const majorVersion = Number(
                this.deviceInfo.browser_version.split('.')[0]
            );

            if (majorVersion < browserMatchVersion) {
                this.router.navigate(['/browser'])
                    .catch(error => console.error(error))
                    .finally(() => {
                        this.CONFIG.browserNotSupported = true;
                        this.appStateService.ready = true;
                    });
                return;
            }
        } // else -> unknown platform or device ... cross fingers and hope for the best

        if (!bootstrapProvider.loaded) {
            if (!this.environment.isLocal) {
                this.router.navigate(['/503'])
                    .catch(error => console.error(error))
                    .finally(() => {
                        this.appStateService.ready = true;
                    });
            }
            this.appStateService.headerVisibility = false;
            this.appStateService.footerVisibility = false;
            return;
        } else if (bootstrapProvider.newSystem) {
            // Cleanup any leftovers. Hard clear() cause page reload loop
            this.cookieService.deleteAll();
            this.localStorageService.clear('refreshToken');
            this.localStorageService.clear('cloudAccessToken');
            this.localStorageService.clear('cloudApiAccessToken');
            this.localStorageService.clear('cloudApiRefreshToken');
            // **********************************************************
            this.newSystem = true;
            this.CONFIG.newSystem = true;
            this.localStorageService.store('resetServer', false);
            this.dialogsService.wizard();
            return;
        }

        // in case user switches to a different system before setting up reset system again
        this.localStorageService.store('resetServer', false);
        this.scrollMechanicsService.setWindowSize(
            window.innerHeight,
            window.innerWidth
        );

        // (Smart check) Check if page is displayed inside an iframe
        // this.isInIframe = (window.location !== window.parent.location);

        // Route check if page is displayed inside an iframe
        this.CONFIG.isInIframe = (
            this.window.location.pathname.startsWith('/embed') ||
            this.window.location.search.includes('adminPreview=true')
        );
        if (this.CONFIG.isInIframe) {
            this.appStateService.headerVisibility = false;
            this.appStateService.footerVisibility = false;
        }
        if (!environment.isLocal && !this.CONFIG.isInIframe && !this.window.navigator.webdriver) {
            if (this.CONFIG.featureFlags.logRocket && this.CONFIG.cloudMonitoring.logRocket) {
                try {
                    LogRocket.init(this.CONFIG.cloudMonitoring.logRocket, {
                        release: '22.1'
                    });
                    this.CONFIG.cloudMonitoring.isLogRocketActive = true;
                    LogRocket.getSessionURL(sessionURL => {
                        console.info('LR: Please attach session url below to tickets');
                        console.info(`LR - Debug session url: ${sessionURL}`);
                    });
                } catch (e) {
                    console.error('LogRocket failed to init');
                    console.error(e);
                }
            }
            if (this.CONFIG.featureFlags.fullStory && this.CONFIG.cloudMonitoring.fullStory) {
                try {
                    FullStory.init({ orgId: this.CONFIG.cloudMonitoring.fullStory });
                    // eslint-disable-next-line @typescript-eslint/dot-notation
                    this.window['_fs_ready'] = () => {
                        this.CONFIG.cloudMonitoring.isFullStoryActive = true;
                        console.info('FS: Please attach session url below to tickets');
                        console.info(`FS - Debug session url: ${FullStory.getCurrentSessionURL(true)}`);
                    };
                } catch (e) {
                    console.error('FullStory failed to init');
                    console.error(e);
                }
            }
        }

        // Updates query params for components without routes.
        this.router.events
            .pipe(
                filter((event: Event) => event instanceof ActivationStart ||
                    event instanceof ActivationEnd ||
                    event instanceof GuardsCheckStart ||
                    event instanceof GuardsCheckEnd
                )
            ).subscribe((event: ActivationStart |
                ActivationEnd |
                GuardsCheckStart |
                GuardsCheckEnd
            ) => {
                if (event instanceof GuardsCheckStart) {
                    this.loading = true;
                    return;
                }
                if (event instanceof GuardsCheckEnd) {
                    this.loading = false;
                    return;
                }

                if ('debug' in event.snapshot.queryParams) {
                    this.CONFIG.allowDebugMode = true;
                }

                this.uriService.queryParams = event.snapshot.queryParams;
                if (this.mainContainer?.nativeElement) {
                    this.mainContainer.nativeElement.scrollTop = 0;
                }
            });

        fromEvent<FocusEvent>(this.window, 'resize')
            .pipe(debounceTime(100))
            .subscribe(event => {
                const { innerHeight, innerWidth } = event.target as Window;
                this.scrollMechanicsService.setWindowSize(innerHeight, innerWidth);
            });
    }

    headerResize(size: { width: number, height: number }): void {
        if (this.headerHeight !== size.height) {
            this.appStateService.headerContainerHeight$.next(size.height);
            this.headerHeight = size.height;
        }
    }

    @HostListener('window:popstate')
    windowListener(): void {
        if (this.applyService.locked) {
            window.history.go(1);
            this.applyService.showDialog().catch(() => {
            });
        }
    }
}
