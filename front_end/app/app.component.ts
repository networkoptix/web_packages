import { Location }                                           from '@angular/common';
import { Component, HostListener, Inject, ViewEncapsulation } from '@angular/core';
import { ActivationStart, Event, Router }                     from '@angular/router';
import { CookieService }                                      from 'ngx-cookie-service';
import { DeviceDetectorService }                   from 'ngx-device-detector';
import { debounceTime, filter, finalize, timeout } from 'rxjs/operators';
import { fromEvent }                               from 'rxjs';
import { NxRibbonService }                         from './src/components/ribbon';
import { WINDOW }                                  from './src/services/window-provider';
import { NxApplyService }                          from './src/services/apply.service';
import { NxAppStateService }                       from './src/services/nx-app-state.service';
import { NxScrollMechanicsService }                from './src/services/scroll-mechanics.service';
import { NxUriService }                            from './src/services/uri.service';
import { NxPageService }                           from './src/services/page.service';
import { NxBootstrapProvider }                     from './src/services/nx-bootstrap-provider';
import { NxDialogsService }                        from './src/dialogs/dialogs.service';

require('what-input');

@Component({
    selector : 'nx-app',
    template : `
        <div class="outerContainer" *ngIf="appStateService.ready">
            <div class="headerContainer">
                <nx-header></nx-header>
                <nx-ribbon></nx-ribbon>
            </div>

            <div class="mainContainer" nxScrollHelper>
                <router-outlet></router-outlet>
            </div>
        </div>
        <nx-pre-loader type="page" *ngIf="!appStateService.ready && !newSystem"></nx-pre-loader>
        <app-toasts aria-live="polite" aria-atomic="true"></app-toasts>`,
    styleUrls     : ['./app.component.scss'],
    encapsulation : ViewEncapsulation.None
})

export class AppComponent {
    deviceInfo: any;
    allowedDevices: {};
    isInIframe: boolean;
    newSystem: boolean;

    constructor(
        bootstrapProvider: NxBootstrapProvider,
        public appStateService: NxAppStateService,
        private cookieService: CookieService,
        private deviceService: DeviceDetectorService,
        private location: Location,
        private applyService: NxApplyService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private router: Router,
        private ribbonService: NxRibbonService,
        private uriService: NxUriService,
        private pageService: NxPageService,
        private dialogsService: NxDialogsService,
        @Inject(WINDOW) private window: Window
    ) {
        if (!bootstrapProvider.loaded) {
            this.router.navigate(['/503'])
                .catch((error) => console.error(error))
                .finally(() => {
                    this.appStateService.ready = true;
                });
            this.appStateService.setHeaderVisibility(false);
            this.appStateService.setFooterVisibility(false);
            return;

        } else if (bootstrapProvider.newSystem) {
            this.newSystem = true;
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

        // TODO: Componentize this
        this.allowedDevices = {
            windows: {
                ie      : 10,
                safari  : 10,
                chrome  : 64,
                firefox : 60
            },
            mac: {
                safari  : 10,
                chrome  : 64,
                firefox : 60
            },
            linux: {
                chrome  : 64,
                firefox : 60
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
            this.applyService.showDialog().catch(() => {
            });
        }
    }
}
