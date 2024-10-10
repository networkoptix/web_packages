import { Component, HostListener, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import * as FullStory from '@fullstory/browser';
import { CookieService } from 'ngx-cookie-service';
import { DeviceDetectorService } from 'ngx-device-detector';
import { LocalStorageService } from 'ngx-webstorage';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAccountService } from '@services/account.service';
import { NxApplyService } from '@services/apply.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { nxConfig } from '@services/nx-config/config';
import { useNewCloud } from '@utils/general';

@Component({
    selector: 'nx-app',
    template: `
        @if (newCloud) {
            <nx-new-cloud />
        } @else {
            <nx-legacy-cloud />
        }
    `,
})
export class AppComponent {
    newCloud = useNewCloud();

    private applyService = inject(NxApplyService);

    @HostListener('window:popstate')
    windowListener(): void {
        if (this.applyService.locked) {
            window.history.go(1);
            this.applyService.showDialog().catch(() => {});
        }
    }

    constructor(
        private router: Router,
        private dialogsService: NxDialogsService,
        private localStorageService: LocalStorageService,
        private accountService: NxAccountService,
        private cookieService: CookieService,
        private deviceService: DeviceDetectorService,
        public appStateService: NxAppStateService,
    ) {
        const url = new URL(window.location.href.replace('#/', ''));
        const auth = url.searchParams.get('auth');
        const code = url.searchParams.get('code');
        const refreshToken = url.searchParams.get('refresh_token');

        if (refreshToken) {
            this.accountService.handleRefreshTokenLogin(refreshToken).finally(() => {
                this.appStateService.ready = true;
            });
        } else if (auth) {
            this.accountService.handleAuthKeyLogin(auth);
        } else if (code && !url.toString().includes('cloud-authorize')) {
            this.accountService.handleCodeLogin(code);
        } else {
            this.accountService.get(true).finally(() => {
                this.appStateService.ready = true;
            });
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
        const browserBlacklist = {
            ie: 9999,
            'ms-edge': 84,
            'ms-edge-chromium': 84,
            safari: 12,
            chrome: 76,
            firefox: 72,
            opera: 70,
        };

        const deviceInfo = this.deviceService.getDeviceInfo();
        let browserMatchVersion = browserBlacklist[deviceInfo.browser.toLowerCase()] || 0;

        // Special case for Kyle's robot tests
        // ... device detector doesn't detect it correctly
        if (deviceInfo.userAgent.includes('HeadlessChrome')) {
            browserMatchVersion = undefined;
        }

        if (browserMatchVersion !== undefined) {
            const majorVersion = Number(deviceInfo.browser_version.split('.')[0]);

            if (majorVersion < browserMatchVersion) {
                this.router
                    .navigate(['/browser'])
                    .catch(error => console.error(error))
                    .finally(() => {
                        nxConfig.browserNotSupported = true;
                        this.appStateService.ready = true;
                    });
                return;
            }
        } // else -> unknown platform or device ... cross fingers and hope for the best

        if (!NxBootstrapProvider.isLoaded) {
            this.router
                .navigate(['/503'])
                .catch(error => console.error(error))
                .finally(() => {
                    this.appStateService.ready = true;
                });
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
            nxConfig.newSystem = true;
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
        nxConfig.isInIframe =
            window.location.pathname.startsWith('/embed') ||
            window.location.search.includes('adminPreview=true');
        if (nxConfig.isInIframe) {
            this.appStateService.headerVisibility = false;
            this.appStateService.footerVisibility = false;
        }

        if (!nxConfig.isInIframe && !navigator.webdriver) {
            if (nxConfig.featureFlags.fullStory && nxConfig.cloudMonitoring.fullStory) {
                try {
                    FullStory.init({ orgId: nxConfig.cloudMonitoring.fullStory });
                    // eslint-disable-next-line dot-notation,@typescript-eslint/dot-notation
                    window['_fs_ready'] = () => {
                        nxConfig.cloudMonitoring.isFullStoryActive = true;
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
    }
}
