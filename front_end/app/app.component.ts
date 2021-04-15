import {
    Component, HostListener, Inject,
    ViewEncapsulation, ViewChild, ElementRef
}                                                  from '@angular/core';
import {
    ActivatedRoute, ActivationStart, Event, NavigationEnd, Router
}                                                  from '@angular/router';
import { CookieService }                           from 'ngx-cookie-service';
import { DeviceDetectorService }                   from 'ngx-device-detector';
import { debounceTime, filter, finalize, timeout } from 'rxjs/operators';
import { fromEvent }                               from 'rxjs';
import { NxRibbonService }                         from '@components/ribbon';
import { WINDOW }                                  from '@services/window-provider';
import { NxApplyService }                          from '@services/apply.service';
import { NxAppStateService }                       from '@services/nx-app-state.service';
import { NxScrollMechanicsService }                from '@services/scroll-mechanics.service';
import { NxUriService }                            from '@services/uri.service';
import { NxPageService }                           from '@services/page.service';
import { NxBootstrapProvider }                     from '@services/nx-bootstrap-provider';
import { NxDialogsService }                        from '@dialogs/dialogs.service';
import { NxConfigService, IConfig }                from '@services/nx-config';
import { NxCloudApiService }                       from '@services/nx-cloud-api';

require('what-input');
require('./scripts/vendor/protocolcheck');

@Component({
    selector : 'nx-app',
    template : `
        <div class="headerContainer">
            <nx-header *ngIf="(appStateService.ready || CONFIG.isLocal) && !CONFIG.browserNotSupported"></nx-header>
            <nx-ribbon></nx-ribbon>
        </div>
        <div class="outerContainer"
             *ngIf="appStateService.ready"
            [ngStyle]="{ 'height': appStateService.ribbonVisibility ? appStateService.heightWithRibbon : appStateService.heightWithoutRibbon }">
            <div class="mainContainer" [ngClass]="{altMainBackground: appStateService.altBackground}" nxScrollHelper #mainContainer>
                <router-outlet></router-outlet>
            </div>
        </div>
        <nx-overlay-modal *ngIf="appStateService.ready && CONFIG.isLocal"></nx-overlay-modal>
        <nx-pre-loader type="page" *ngIf="!appStateService.ready && !newSystem"></nx-pre-loader>
        <app-toasts aria-live="polite" aria-atomic="true"></app-toasts>`,
    styleUrls     : ['./app.component.scss'],
    encapsulation : ViewEncapsulation.None
})

export class AppComponent {
    deviceInfo: any;
    browserBlacklist: {};
    isInIframe: boolean;
    newSystem: boolean;

    CONFIG: IConfig;

    @ViewChild('mainContainer') mainContainer: ElementRef<HTMLDivElement>;

    constructor(
        bootstrapProvider: NxBootstrapProvider,
        configService: NxConfigService,
        public appStateService: NxAppStateService,
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
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.getConfig();

        // hides header if an authorize (oauth) route
        this.router.events
            .pipe(filter(ev => ev instanceof NavigationEnd), debounceTime(50))
            .subscribe((ev: NavigationEnd) => {
                this.appStateService.authorizing =
                    ev.url.includes('authorize') ||
                    ev.url.includes('activate') ||
                    ev.url.includes('restore_password');
            });

        /* No real need to update often unless some browser have major upgrade
         * and we don't want to support previous releases
         *
         * IE and Edge are here just for reference
         * Angular will not make it through here as they are not supported at all ... see index.html
         */
        this.browserBlacklist = {
            ie                 : 9999,
            'ms-edge'          : 9999,
            'ms-edge-chromium' : 84,
            safari             : 12,
            chrome             : 76,
            firefox            : 72,
            opera              : 70
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
            this.router.navigate(['/503'])
                .catch((error) => console.error(error))
                .finally(() => {
                    this.appStateService.ready = true;
                });
            this.appStateService.headerVisibility = false;
            this.appStateService.footerVisibility = false;
            return;
        } else if (bootstrapProvider.newSystem) {
            this.newSystem = true;
            this.CONFIG.newSystem = true;
            this.dialogsService.wizard();
            return;
        }

        // Allows 3 seconds for auth query param to be detected and set appState.ready to false.
        // This makes sure only the preloader is shown before the page is refreshed to a logged in state.
        // After 3 seconds we unsubscribe to make sure we don't change the ready state while the app is already loaded
        const authUriSub = this.uriService.getURI()
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
        this.router.events.pipe(
            filter((event: Event) => event instanceof ActivationStart)
        ).subscribe(({ snapshot: { queryParams } }: ActivationStart) => {
            if ('debug' in queryParams) {
                this.CONFIG.allowDebugMode = true;
            }
            this.uriService.queryParams = queryParams;
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
