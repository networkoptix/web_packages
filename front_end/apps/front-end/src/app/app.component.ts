import {
    Component,
    ElementRef,
    HostListener,
    OnInit,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import {
    ActivationEnd,
    ActivationStart,
    GuardsCheckEnd,
    GuardsCheckStart,
    NavigationEnd,
    Router,
    Event as RouterEvent,
} from '@angular/router';
import * as FullStory from '@fullstory/browser';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CookieService } from 'ngx-cookie-service';
import { DeviceDetectorService } from 'ngx-device-detector';
import type { DeviceInfo } from 'ngx-device-detector';
import { LocalStorageService } from 'ngx-webstorage';
import { fromEvent } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { NxApplyService } from '@services/apply.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { nxConfig } from '@services/nx-config/config';
import type { IConfig } from '@services/nx-config/config-types';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxThemeService } from '@services/theme.service';
import { NxUriService } from '@services/uri.service';
import { windowFactory } from '@services/window-provider';

require('what-input');

@UntilDestroy()
@Component({
    selector: 'nx-app',
    template: ` <div
        *ngIf="themeSet"
        [style.height]="windowHeight + 'px'"
    >
        <div
            *ngIf="!reauthorizing"
            class="headerContainer"
            (resize)="headerResize($event)"
        >
            <ng-template #header></ng-template>
            <ng-template #ribbon></ng-template>
        </div>
        <div
            class="outerContainer"
            [ngStyle]="{
                height: appStateService.appContainerHeight,
                display: appStateService.ready || reauthorizing ? '' : 'none'
            }"
        >
            <div
                class="mainContainer"
                data-testid="mainContainer"
                [ngClass]="{
                    altMainBackground: appStateService.altBackground
                }"
                nxScrollHelper
                cdkScrollable
                #mainContainer
            >
                <nx-tour-step-component></nx-tour-step-component>
                <ng-template #cookieBanner></ng-template>
                <router-outlet></router-outlet>
            </div>
            <nx-nav-footer *ngIf="CONFIG.featureFlags.newHeader"></nx-nav-footer>
        </div>
        <ng-container *ngIf="!reauthorizing">
            <nx-pre-loader
                type="page"
                *ngIf="(!appStateService.ready && !newSystem) || loading"
            ></nx-pre-loader>
            <ng-template #appToast></ng-template>
        </ng-container>
    </div>`,
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit {
    private window: Window = windowFactory();
    CONFIG: IConfig = nxConfig;
    deviceInfo: DeviceInfo;
    browserBlacklist: Record<string, number>;
    newSystem: boolean;
    loading: boolean;
    reauthorizing: boolean;
    headerHeight: number;
    themeSet: boolean = false;
    windowHeight: number = this.window.innerHeight;

    readonly environment = environment;

    @ViewChild('mainContainer') mainContainer: ElementRef<HTMLDivElement>;
    @ViewChild('header', { read: ViewContainerRef }) header: ViewContainerRef;
    @ViewChild('appToast', { read: ViewContainerRef }) appToast: ViewContainerRef;
    @ViewChild('ribbon', { read: ViewContainerRef }) ribbon: ViewContainerRef;
    @ViewChild('cookieBanner', { read: ViewContainerRef }) cookieBanner: ViewContainerRef;

    lazyLoadHeader = async (): Promise<void> => {
        await import('@components/header/header.module').then(m => m.HeaderModule);
        const { NxHeaderComponent } = await import('@components/header/header.component');
        this.header.createComponent(NxHeaderComponent);
    };

    lazyLoadComponents = async (): Promise<void> => {
        // requestIdleCallback is not supported in Safari so the next best thing is setTimeout.
        const idle = (): Promise<unknown> =>
            new Promise(resolve =>
                this.window?.requestIdleCallback
                    ? requestIdleCallback(resolve)
                    : setTimeout(resolve),
            );

        await idle();
        await import('@components/toast-container/toast-container.module').then(
            m => m.ToastContainerModule,
        );
        const { NxToastsContainer } = await import('@components/toast-container/toast.component');
        this.appToast.createComponent(NxToastsContainer);

        if (nxConfig.featureFlags.cookieBanner) {
            await idle();
            const { NxCookieBannerComponent } = await import(
                '@components/cookie-banner/cookie-banner.component'
            );
            this.cookieBanner.createComponent(NxCookieBannerComponent);
        }

        await idle();
        await import('@components/ribbon/ribbon.module').then(m => m.RibbonModule);
        const { NxRibbonComponent } = await import('@components/ribbon/ribbon.component');
        this.ribbon.createComponent(NxRibbonComponent);
    };

    constructor(
        public appStateService: NxAppStateService,
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
    ) {
        this.reauthorizing = this.window.location.href.includes('cloud-authorize');

        const url = new URL(this.window.location.href.replace('#/', ''));
        const auth = url.searchParams.get('auth');
        const code = url.searchParams.get('code');
        const refreshToken = url.searchParams.get('refresh_token');

        if (refreshToken) {
            this.accountService.handleRefreshTokenLogin(refreshToken).finally(() => {
                this.appStateService.ready = true;
            });
        } else if (!this.environment.isLocal && auth) {
            this.accountService.handleAuthKeyLogin(auth);
        } else if (
            !this.environment.isLocal &&
            code &&
            !url.toString().includes('cloud-authorize')
        ) {
            this.accountService.handleCodeLogin(code);
        } else {
            this.accountService.get(true).finally(() => {
                this.appStateService.ready = true;
            });
        }
        // Set Window height to accommodate mobile browser bars
        fromEvent(windowFactory(), 'resize')
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.windowHeight = windowFactory().innerHeight;
            });

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
            opera: 70,
        };

        this.deviceInfo = this.deviceService.getDeviceInfo();
        let browserMatchVersion = this.browserBlacklist[this.deviceInfo.browser.toLowerCase()] || 0;

        // Special case for Kyle's robot tests
        // ... device detector doesn't detect it correctly
        if (this.deviceInfo.userAgent.includes('HeadlessChrome')) {
            browserMatchVersion = undefined;
        }

        if (browserMatchVersion !== undefined) {
            const majorVersion = Number(this.deviceInfo.browser_version.split('.')[0]);

            if (majorVersion < browserMatchVersion) {
                this.router
                    .navigate(['/browser'])
                    .catch(error => console.error(error))
                    .finally(() => {
                        this.CONFIG.browserNotSupported = true;
                        this.appStateService.ready = true;
                    });
                return;
            }
        } // else -> unknown platform or device ... cross fingers and hope for the best

        if (!NxBootstrapProvider.isLoaded) {
            if (!this.environment.isLocal) {
                this.router
                    .navigate(['/503'])
                    .catch(error => console.error(error))
                    .finally(() => {
                        this.appStateService.ready = true;
                    });
            }
            this.appStateService.headerVisibility = false;
            this.appStateService.footerVisibility = false;
            return;
        } else if (NxBootstrapProvider.isNewSystem) {
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
        } else if (nxConfig.featureFlags.newHeader) {
            router.events.subscribe(event => {
                if (event instanceof NavigationEnd) {
                    this.appStateService.footerVisibility =
                        event.url.split('/').filter(segment => !!segment)?.[0] !== 'systems';
                }
            });
        }

        // in case user switches to a different system before setting up reset system again
        this.localStorageService.store('resetServer', false);

        // (Smart check) Check if page is displayed inside an iframe
        // this.isInIframe = (window.location !== window.parent.location);

        // Route check if page is displayed inside an iframe
        this.CONFIG.isInIframe =
            this.window.location.pathname.startsWith('/embed') ||
            this.window.location.search.includes('adminPreview=true');
        if (this.CONFIG.isInIframe) {
            this.appStateService.headerVisibility = false;
            this.appStateService.footerVisibility = false;
        }

        if (!environment.isLocal && !this.CONFIG.isInIframe && !this.window.navigator.webdriver) {
            if (nxConfig.featureFlags.fullStory && this.CONFIG.cloudMonitoring.fullStory) {
                try {
                    FullStory.init({ orgId: this.CONFIG.cloudMonitoring.fullStory });
                    // eslint-disable-next-line dot-notation,@typescript-eslint/dot-notation
                    this.window['_fs_ready'] = () => {
                        this.CONFIG.cloudMonitoring.isFullStoryActive = true;
                        console.info('FS: Please attach session url below to tickets');
                        console.info(
                            `FS - Debug session url: ${FullStory.getCurrentSessionURL(true)}`,
                        );
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
                filter(
                    (event: RouterEvent) =>
                        event instanceof ActivationStart ||
                        event instanceof ActivationEnd ||
                        event instanceof GuardsCheckStart ||
                        event instanceof GuardsCheckEnd,
                ),
                untilDestroyed(this),
            )
            .subscribe(
                (event: ActivationStart | ActivationEnd | GuardsCheckStart | GuardsCheckEnd) => {
                    if (event instanceof GuardsCheckStart) {
                        const nextRoute = event.url?.split('?')?.[0];
                        const currentRoute = this.router.url?.split('?')?.[0];
                        this.loading = nextRoute !== currentRoute || nextRoute === '/';
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
                },
            );
    }

    ngOnInit(): void {
        this.themeService.initTheme().finally(() => {
            this.themeSet = true;
            setTimeout(() => {
                this.initComponents();
                this.initScroll();
            });
        });
    }

    headerResize(size: { width: number; height: number }): void {
        if (this.headerHeight !== size.height) {
            this.appStateService.headerContainerHeight$.next(size.height);
            this.headerHeight = size.height;
        }
    }

    @HostListener('window:popstate')
    windowListener(): void {
        if (this.applyService.locked) {
            this.window.history.go(1);
            this.applyService.showDialog().catch(() => {});
        }
    }

    private initScroll(): void {
        fromEvent<Event>(this.mainContainer.nativeElement, 'scroll')
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.scrollMechanicsService.windowScroll =
                    this.mainContainer.nativeElement.scrollTop;
            });

        this.scrollMechanicsService.windowScrollSubject
            .pipe(untilDestroyed(this))
            .subscribe(scroll => {
                const prevScroll = this.mainContainer.nativeElement.scrollTop;
                if (prevScroll !== scroll) {
                    // Only triggers on programmatically set scroll
                    this.mainContainer.nativeElement.scrollTop = scroll;
                }
            });
    }

    private initComponents(): void {
        if (!this.CONFIG.browserNotSupported) {
            if (environment.isLocal || this.appStateService.ready) {
                this.lazyLoadHeader();
            } else {
                this.appStateService.readySubject
                    .pipe(
                        filter(ready => ready),
                        take(1),
                    )
                    .subscribe(() => this.lazyLoadHeader());
            }
            this.lazyLoadComponents();
        }
    }
}
