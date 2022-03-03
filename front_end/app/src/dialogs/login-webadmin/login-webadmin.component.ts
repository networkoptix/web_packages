import { DOCUMENT, Location } from '@angular/common';
import {
    Component,
    Inject,
    OnInit,
    ViewChild
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxSimpleDialogsService } from '@dialogs/simple-dialogs.service';
import type { NxAccountService } from '@services/account.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service';
import { NxStorageService } from '@services/storage.service';
import { WINDOW } from '@services/window-provider';
import { pickFrom } from '@utils/general';

/**
 * Parse url string to:
 *
 *   protocol -> match[1],
 *
 *   host     -> match[2],
 *
 *   hostname -> match[3],
 *
 *   port     -> match[4],
 *
 *   pathname -> match[5],
 *
 *   search   -> match[6],
 *
 *   hash     -> match[7]
 *
 * */
function getRelativeLocation(href: string): string {
    const match = href.match(/^(https?:)?\/\/(([^:\/?#]*)(?::([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/);
    if (match) {
        return match[5] + match[6] + match[7];
    } else {
        // href not recognized as valid url
        return href;
    }
}

@Component({
    selector: 'nx-login-webadmin-modal',
    templateUrl: 'login-webadmin.component.html',
    styleUrls: ['login-webadmin.component.scss']
})
export class LoginWebadminModalContent implements OnInit {
    account: NxAccountService;
    keepPage: boolean;
    blockNavigation: boolean;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    locationService: Location;
    auth: { email: string };
    login: Process;
    next: string;
    password: string;
    hideErrors: boolean = true;

    wrongCredentials: boolean;
    accountBlocked: boolean;

    @ViewChild('loginForm', { static: true }) loginForm: NgForm;

    private setupDefaults(): void {
        this.auth = { email: this.storageService.email };
        this.next = '';
        this.password = '';
        this.wrongCredentials = false;
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        locationService: Location,
        private processService: NxProcessService,
        private storageService: NxStorageService,
        private appStateService: NxAppStateService,
        private simpleDialogService: NxSimpleDialogsService,
        private router: Router,
        private cookieService: CookieService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
        @Inject(DOCUMENT) private document: Document,
        @Inject(WINDOW) protected window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.locationService = locationService;

        this.setupDefaults();
    }

    // resendActivation(email) {
    //     this.activeModal.close();

    //     this.processService.createProcess(() => {
    //         return this.account.reactivate(email);
    //     }, {
    //         errorCodes: {
    //             forbidden: this.LANG.errorCodes.accountAlreadyActivated(),
    //             notFound: this.LANG.errorCodes.emailNotFound()
    //         },
    //         holdAlerts: true,
    //         errorPrefix: this.LANG.errorCodes.cantSendConfirmationPrefix()
    //     });
    // }

    resetForm(): void {
        if (!this.loginForm.valid) {
            this.loginForm.controls.login_email.setErrors(undefined);
            this.loginForm.controls.login_password.setErrors(undefined);
            this.wrongCredentials = false;
            this.accountBlocked = false;
        }
    }

    setEmail(email: string): void {
        this.auth.email = email;
        this.storageService.email = this.auth.email;
    }

    ngOnInit(): void {
        // These are passed by login service but
        // only "account", "keepPage" and "blockNavigation" were set as @Input
        // ******************************************
        // account, login, cancellable, location, keepPage,
        // redirectClose, redirectHome, blockNavigation
        pickFrom(
            this.dialogData,
            ['account', 'keepPage', 'blockNavigation'],
            this
        );

        const url = new URL(this.document.location.href);
        const [hash, query] = url.hash.split('?');
        const params = new URLSearchParams(query || '');
        const code = params.get('code');
        if (code) {
            params.delete('code');
            const paramString = params.toString();
            url.hash = hash + (paramString ? '?' + paramString : '');
            this.window.location.href = url.toString();
            return this.oauthLogin(code);
        }

        // remove any leftovers  *****************************
        this.cookieService.delete('x-runtime-guid');
        this.storageService.clear('refreshToken');
        this.storageService.clear('cloudAccessToken');
        this.storageService.clear('cloudApiAccessToken');
        this.storageService.clear('cloudApiRefreshToken');
        // ****************************************************

        // Check the url queryParams for next. if it exists set next equal to it.
        const nextUrl = /\?next=(.*)/.exec(
            this.document.location.search.replace(/%2F/g, '/')
        );
        if (nextUrl && nextUrl.length > 1) {
            this.next = nextUrl[1];
        }
        this.password = '';

        const showAccountBlockedError = () => {
            this.loginForm.controls.login_password.markAsPristine();
            this.loginForm.controls.login_password.markAsUntouched();

            this.accountBlocked = true;
            this.loginForm.controls.login_password.setErrors({
                nx_account_blocked: true
            });
        };

        const showWrongCredentialsError = () => {
            this.password = '';
            this.wrongCredentials = true;
            this.loginForm.controls.login_email.setErrors({
                nx_wrong_credentials: true
            });
            this.loginForm.controls.login_password.setErrors({
                nx_wrong_credentials: true
            });
        };

        const cloudLogin = this.LANG.errorCodes['This authorization method is forbidden. Please contact your system administrator.']();
        const errorCodes = {
            notFound: showWrongCredentialsError,
            invalidParameter: showWrongCredentialsError,
            notAuthorized: showWrongCredentialsError,
            serviceUnavailable: showAccountBlockedError,
            accountBlocked: showAccountBlockedError
        };
        errorCodes[cloudLogin] = () => this.LANG.toastMessage.webAdminCloudCredentialError();
        this.login = this.processService.createProcess(() => {
            this.loginForm.controls.login_email.setErrors(undefined);
            this.loginForm.controls.login_password.setErrors(undefined);
            this.wrongCredentials = false;
            this.accountBlocked = false;

            return this.account.login(
                this.auth.email,
                this.password,
                true
            );
        }, {
            ignoreUnauthorized: true,
            errorCodes
        }, result => {
            this.close(result);
            if (this.blockNavigation) {
                return;
            }
            const isRootPath = ['/', ''].includes(this.locationService.path());

            // prevent manual input of url for activate routes
            this.appStateService.canManuallyAccess = this.next.includes('activate');

            if (this.keepPage) {
                if (isRootPath) {
                    this.router
                        .navigate([this.CONFIG.redirect.authorised])
                        .then(() => {
                            // ensure language reload as translations are loaded on page load
                            this.window.location.reload();
                        });
                } else {
                    // TODO: remove window reload once we separate session state from account service
                    this.window.location.reload();
                }
            } else if (this.next) {
                // sanitize this.next
                this.next = getRelativeLocation(this.next);
                this.router
                    .navigate([this.next])
                    .then(() => {
                        // *** window.location.reload(); // ensure language reload as translations are loaded on page load
                        // *** admin section is not a part of Angular project
                        this.window.location.href = this.next;
                    });
            } else {
                setTimeout(() => {
                    this.router
                        .navigate(
                            [this.CONFIG.redirect.authorised],
                            { replaceUrl: isRootPath }
                        ).then(() => {
                            // ensure language reload as translations are loaded on page load
                            this.window.location.reload();
                        });
                });
            }
        }, error => {
            console.error(error);
        });
    }

    redirectOauthLogin(): void {
        const displayCloudConnectionError = () => {
            this.simpleDialogService.notify(
                this.LANG.toastMessage.noInternet(),
                'warning',
                true
            );
        };

        this.account.mediaServerApi.getModuleInfo()
            .subscribe(data => {
                // Handles legacy and rest apis
                if (data.reply) {
                    data = data.reply;
                }
                if (this.window.navigator.onLine && data.serverFlags.includes('SF_HasPublicIP')) {
                    this.account.mediaServerApi.redirectOauth();
                } else {
                    displayCloudConnectionError();
                }
            }, () => displayCloudConnectionError());
    }

    oauthLogin(code: string): void {
        this.account.mediaServerApi
            .loginOauth(code)
            .subscribe(() => {
                this.window.location.reload();
            });
    }

    close = msg => {
        this.dialogRef.close(msg);
    };
}
