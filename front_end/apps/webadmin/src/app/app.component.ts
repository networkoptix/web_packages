import {
    AfterViewInit,
    Component,
    ElementRef,
    HostListener,
    ViewChild,
    ViewContainerRef,
    ViewEncapsulation,
} from '@angular/core';
import {
    ActivationEnd,
    ActivationStart,
    GuardsCheckEnd,
    GuardsCheckStart,
    Router,
    Event as RouterEvent,
} from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CookieService } from 'ngx-cookie-service';
import { DeviceDetectorService } from 'ngx-device-detector';
import type { DeviceInfo } from 'ngx-device-detector';
import { LocalStorageService } from 'ngx-webstorage';
import { fromEvent } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { NxApplyService } from '@services/apply.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { nxConfig } from '@services/nx-config/config';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxThemeService } from '@services/theme.service';
import { NxUriService } from '@services/uri.service';

require('what-input');

@UntilDestroy()
@Component({
    selector: 'nx-app',
    template: ` <div
            *ngIf="!reauthorizing"
            class="headerContainer"
            (resize)="headerResize($event)"
        >
            <ng-template #header></ng-template>
            <ng-template #ribbon></ng-template>
        </div>
        <div
            class="outerContainer"
            *ngIf="appStateService.ready || reauthorizing"
            [ngStyle]="{ height: appStateService.appContainerHeight }"
        >
            <div
                class="mainContainer"
                data-testid="mainContainer"
                [ngClass]="{ altMainBackground: appStateService.altBackground }"
                nxScrollHelper
                cdkScrollable
                #mainContainer
            >
                <nx-tour-step-component></nx-tour-step-component>
                <router-outlet></router-outlet>
                <nx-nav-footer *ngIf="CONFIG.featureFlags.newHeader"></nx-nav-footer>
            </div>
        </div>
        <ng-container *ngIf="!reauthorizing">
            <ng-template #overlayModal></ng-template>
            <nx-pre-loader
                type="page"
                *ngIf="(!appStateService.ready && !newSystem) || loading"
            ></nx-pre-loader>
            <ng-template #appToast></ng-template>
        </ng-container>`,
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements AfterViewInit {
    deviceInfo: DeviceInfo;
    browserBlacklist: Record<string, number>;
    newSystem: boolean;
    loading: boolean = false;
    reauthorizing: boolean;
    headerHeight: number;
    CONFIG = nxConfig;
    readonly environment = environment;

    @ViewChild('mainContainer') mainContainer: ElementRef<HTMLDivElement>;
    @ViewChild('header', { read: ViewContainerRef }) header: ViewContainerRef;
    @ViewChild('overlayModal', { read: ViewContainerRef }) overlayModalRef: ViewContainerRef;
    @ViewChild('appToast', { read: ViewContainerRef }) appToast: ViewContainerRef;
    @ViewChild('ribbon', { read: ViewContainerRef }) ribbon: ViewContainerRef;

    lazyLoadHeader = async (): Promise<void> => {
        await import('@components/header/header.component').then(m => m.NxHeaderComponent);
        const { NxHeaderComponent } = await import('@components/header/header.component');
        this.header.createComponent(NxHeaderComponent);
    };

    lazyLoadComponents = async (): Promise<void> => {
        const idle = (): Promise<unknown> => new Promise(resolve => requestIdleCallback(resolve));

        await idle();
        await import('@components/toast-container/toast-container.module').then(
            m => m.ToastContainerModule,
        );
        const { NxToastsContainer } = await import('@components/toast-container/toast.component');
        this.appToast.createComponent(NxToastsContainer);

        await idle();
        await import('@components/ribbon/ribbon.module').then(m => m.RibbonModule);
        const { NxRibbonComponent } = await import('@components/ribbon/ribbon.component');
        this.ribbon.createComponent(NxRibbonComponent);

        if (environment.isWebadmin) {
            await idle();
            await import('@components/overlay-modal/overlay-modal.module').then(
                m => m.OverlayModalModule,
            );
            const { NxOverlayModalComponent } = await import(
                '@components/overlay-modal/overlay-modal.component'
            );
            this.overlayModalRef.createComponent(NxOverlayModalComponent);
        }
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
        private themeService: NxThemeService,
    ) {
        this.reauthorizing = window.location.href.includes('cloud-authorize');

        if (!window.location.hash) {
            window.location.hash = '/';
        }
        if (!this.CONFIG.browserNotSupported) {
            if (environment.isWebadmin || this.appStateService.ready) {
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
        this.appStateService.ready = true;

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
            if (!this.environment.isWebadmin) {
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
            this.cleanUp();
            this.newSystem = true;
            this.localStorageService.store('resetServer', false);
            this.dialogsService.wizard();

            return;
        }

        // in case user switches to a different system before setting up reset system again
        this.localStorageService.store('resetServer', false);

        // (Smart check) Check if page is displayed inside an iframe
        // this.isInIframe = (window.location !== window.parent.location);

        // Route check if page is displayed inside an iframe
        this.CONFIG.isInIframe =
            window.location.pathname.startsWith('/embed') ||
            window.location.search.includes('adminPreview=true');
        if (this.CONFIG.isInIframe) {
            this.appStateService.headerVisibility = false;
            this.appStateService.footerVisibility = false;
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
                },
            );

        if (nxConfig.featureFlags.themesEnabled) {
            this.themeService.initTheme().then(
                () => {}, // weird Safari 12
                () => {},
            );
        }
    }

    cleanUp(): void {
        // Cleanup any leftovers. Hard clear() cause page reload loop
        this.cookieService.deleteAll();
        this.localStorageService.clear('refreshToken');
        this.localStorageService.clear('cloudAccessToken');
        this.localStorageService.clear('cloudApiAccessToken');
        this.localStorageService.clear('cloudApiRefreshToken');
        // **********************************************************
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
            window.history.go(1);
            this.applyService.showDialog().catch(() => {});
        }
    }

    ngAfterViewInit(): void {
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
                    // Only triggers on programatically set scroll
                    this.mainContainer.nativeElement.scrollTop = scroll;
                }
            });
    }
}
