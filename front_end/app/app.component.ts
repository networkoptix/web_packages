import {
    Component, HostListener, Inject,
    ViewEncapsulation, ViewChild, ElementRef
} from '@angular/core';
import {
    ActivationEnd, ActivatedRoute, ActivationStart, Event,
    GuardsCheckEnd, GuardsCheckStart, NavigationEnd, Router
} from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { DeviceDetectorService } from 'ngx-device-detector';
import { LocalStorageService } from 'ngx-webstorage';
import { fromEvent } from 'rxjs';
import {
    debounceTime,
    delay,
    filter,
    finalize,
    map,
    retryWhen,
    take,
    timeout
} from 'rxjs/operators';

import { NxRibbonService } from '@components/ribbon';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { NxApplyService } from '@services/apply.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxPageService } from '@services/page.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';
import { SystemGuard } from '@src/routeGuards';

require('what-input');
require('./scripts/vendor/protocolcheck');

@Component({
    selector: 'nx-app',
    template: `
        <div *ngIf="!reauthorizing" class="headerContainer">
            <nx-header *ngIf="(appStateService.ready || environment.isLocal) && !CONFIG.browserNotSupported"></nx-header>
            <nx-ribbon></nx-ribbon>
        </div>
        <div class="outerContainer"
             *ngIf="appStateService.ready || reauthorizing"
            [ngStyle]="{ 'height': appStateService.appContainerHeight }">
            <div class="mainContainer" [ngClass]="{
                altMainBackground: appStateService.altBackground
            }" nxScrollHelper #mainContainer>
                <nx-cookie-banner></nx-cookie-banner>
                <router-outlet></router-outlet>
            </div>
        </div>
        <ng-container *ngIf="!reauthorizing">
            <nx-overlay-modal *ngIf="appStateService.ready && environment.isLocal"></nx-overlay-modal>
            <nx-pre-loader type="page" *ngIf="(!appStateService.ready && !newSystem) || loading"></nx-pre-loader>
            <app-toasts aria-live="polite" aria-atomic="true"></app-toasts>
        </ng-container>`,
    styleUrls: ['./app.component.scss'],
    encapsulation: ViewEncapsulation.None
})

export class AppComponent {
    deviceInfo: any;
    browserBlacklist: {};
    isInIframe: boolean;
    newSystem: boolean;
    loading: boolean;
    reauthorizing: boolean;

    CONFIG: IConfig;
    environment = environment;

    @ViewChild('mainContainer') mainContainer: ElementRef<HTMLDivElement>;

    private cleanQueryParams(queryParams) {
        queryParams = { ...queryParams };
        if (queryParams.code) {
            queryParams.code = null;
        }
        return queryParams;
    }

    private extractRoute(link) {
        return link.replace(this.window.location.origin, '').split('?')[0];
    }

    constructor(
        bootstrapProvider: NxBootstrapProvider,
        configService: NxConfigService,
        public appStateService: NxAppStateService,
        public systemGuard: SystemGuard,
        private cloudApiService: NxCloudApiService,
        private cookieService: CookieService,
        private deviceService: DeviceDetectorService,
        private applyService: NxApplyService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private router: Router,
        private route: ActivatedRoute,
        private ribbonService: NxRibbonService,
        private uriService: NxUriService,
        private pageService: NxPageService,
        private dialogsService: NxDialogsService,
        private localStorageService: LocalStorageService,
        @Inject(WINDOW) private window: Window
    ) {
        this.reauthorizing = this.window.location.href.includes('cloud-authorize');
        this.CONFIG = configService.getConfig();

        this.router.events
            .pipe(filter(ev => ev instanceof NavigationEnd))
            .subscribe(() => {
                const link = this.window.location.href.replace('/#', '');
                const parts = link.split('?');
                const params = parts.length > 1 && new URLSearchParams(
                    parts[1]
                );
                const code = params && params?.get('code');
                if (code && link.includes('?code') && !this.reauthorizing) {
                    return this.cloudApiService.loginCode(code)
                        .then(() => this.cloudApiService.account(true)
                            .pipe(
                                map(res => {
                                    if (!res) {
                                        throw Error('undefined response from cloud service account');
                                    }
                                    return res;
                                }),
                                retryWhen(errors => errors.pipe(delay(500), take(10)))
                            ).subscribe(() => {
                                const route = this.extractRoute(link);
                                const queryParams = this.cleanQueryParams(this.route.snapshot.queryParams);
                                return this.router.navigate([['/', '/new-landing', '/authorize'].includes(route) ? '/systems' : route], { queryParams })
                                    .then(() => this.window.location.reload());
                            })
                        ).catch(() => {
                            const route = this.extractRoute(link);
                            const queryParams = this.cleanQueryParams(this.route.snapshot.queryParams);
                            return this.router.navigate([route], { queryParams });
                        });
                }
            });

        /* No real need to update often unless some browser have major upgrade
         * and we don't want to support previous releases
         *
         * IE and Edge are here just for reference
         * Angular will not make it through here as they are not supported at all ... see index.html
         */
        this.browserBlacklist = {
            ie: 9999,
            'ms-edge': 9999,
            'ms-edge-chromium': 84,
            safari: 12,
            chrome: 76,
            firefox: 72,
            opera: 70
        };

        this.deviceInfo = this.deviceService.getDeviceInfo();
        let browserMatchVersion = this.browserBlacklist[this.deviceInfo.browser.toLowerCase()] || 0;

        // Special case for Kyle's robot tests
        // ... device detector doesn't detect it correctly
        if (this.deviceInfo.userAgent.indexOf('HeadlessChrome') > -1) {
            browserMatchVersion = undefined;
        }

        if (browserMatchVersion !== undefined) {
            const majorVersion = this.deviceInfo.browser_version.split('.')[0];

            if (majorVersion < browserMatchVersion) {
                this.router.navigate(['/browser'])
                    .catch((error) => console.error(error))
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
                    .catch((error) => console.error(error))
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

        // Allows 3 seconds for auth query param to be detected and set appState.ready to false.
        // This makes sure only the preloader is shown before the page is refreshed to a logged in state.
        // After 3 seconds we unsubscribe to make sure we don't change the ready state while the app is already loaded
        const authUriSub = this.uriService.getParams()
            .pipe(timeout(3000), finalize(() => authUriSub.unsubscribe()))
            .subscribe(params => {
                if (params.auth) {
                    authUriSub.unsubscribe();
                }
                this.appStateService.ready = !params.auth;
            }, () => {
            });

        this.scrollMechanicsService.setWindowSize(window.innerHeight, window.innerWidth);

        // (Smart check) Check if page is displayed inside an iframe
        // this.isInIframe = (window.location !== window.parent.location);

        // Route check if page is displayed inside an iframe
        this.CONFIG.isInIframe = (this.window.location.pathname.indexOf('/embed') === 0 || this.window.location.search.indexOf('adminPreview=true') !== -1);
        if (this.CONFIG.isInIframe) {
            this.appStateService.headerVisibility = false;
            this.appStateService.footerVisibility = false;
        }

        // Updates query params for components without routes.
        this.router.events
            .pipe(
                filter((event: Event) => event instanceof ActivationStart || event instanceof ActivationEnd || event instanceof GuardsCheckStart || event instanceof GuardsCheckEnd)
            ).subscribe((event: ActivationStart | ActivationEnd | GuardsCheckStart | GuardsCheckEnd) => {
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
                this.mainContainer.nativeElement.scrollTop = 0;
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
            this.applyService.showDialog().catch(() => {
            });
        }
    }
}
