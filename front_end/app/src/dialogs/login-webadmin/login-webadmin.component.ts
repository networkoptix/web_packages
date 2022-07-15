import { DOCUMENT, Location } from '@angular/common';
import {
    Component,
    Inject,
    OnInit,
    Renderer2,
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
import { OauthService } from '@services/oauth.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
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

    loading: boolean = true;

    locationService: Location;
    auth: { email: string };
    login: Process;
    next: string;
    password: string;
    hideErrors: boolean = true;

    wrongCredentials: boolean;
    accountBlocked: boolean;
    accountNotOnSystem: boolean;
    account2faRequired: boolean;

    private readonly urlUpdateTimeout: number = 150;

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
        private oauthService: OauthService,
        private renderer: Renderer2,
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

    private removeParamFromUrl(url: URL, hash: string, params: URLSearchParams, paramName: string): void {
        params.delete(paramName);
        const paramString = params.toString();
        url.hash = hash + (paramString ? '?' + paramString : '');
        this.window.location.href = url.toString();
    }

    private displayCloudConnectionError(): void {
        this.simpleDialogService.notify(
            this.LANG.toastMessage.noInternet(),
            'warning',
            true
        );
    }

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
        const token = params.get('token');
        if (code) {
            this.removeParamFromUrl(url, hash, params, 'code');
            this.oauthLogin(code);
            return;
        } else if (token) {
            this.removeParamFromUrl(url, hash, params, 'token');
            this.tokenLogin(token);
            return;
        } else {
            this.loading = false;
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
            this.renderer.selectRootElement('#login_password').focus();
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
        /* FIXME: Type error for WebAdmin, LocalAccount.login()
        returns an Observable which makes the first argument () => Observable,
        but NxProcessService.createProcess() expects Observable
        or () => PromiseLike */
        // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
        // @ts-ignore
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
        this.account.mediaServerApi.getServerInfo('*')
            .subscribe(data => {
                const systemHasInternet = data.some(system => system.serverFlags.includes('SF_HasPublicIP'));
                if (this.window.navigator.onLine && systemHasInternet) {
                    this.account.mediaServerApi.redirectOauth();
                } else {
                    this.displayCloudConnectionError();
                }
            }, () => this.displayCloudConnectionError());
    }

    oauthLogin(code: string): void {
        this.account.mediaServerApi
            .loginOauth(code)
            .subscribe((res: Record<string, string>) => {
                this.accountNotOnSystem = res.scope === '';

                if (
                    !this.accountNotOnSystem &&
                    res.error === 'second_factor_required'
                ) {
                    this.oauthService.redirectOauth(
                        'system2faAuth',
                        '',
                        code,
                        res.access_token,
                        this.window.location.href
                    );
                    return;
                }

                this.account2faRequired = res.error === '2fa_disabled_for_the_user';
                this.loading = !(this.accountNotOnSystem || this.account2faRequired);

                if (!this.accountNotOnSystem && !this.account2faRequired) {
                    this.account.get(true).then(res => {
                        if (res) {
                            this.window.location.reload();
                        } else {
                            this.loading = false;
                            this.displayCloudConnectionError();
                        }
                    });
                }
            });
    }

    tokenLogin(token: string): void {
        this.account.mediaServerApi.loginTokenUrl(token)
            .subscribe(() => {
                // If the page reloads too soon. Webadmin redirects to /
                setTimeout(() => this.window.location.reload(), this.urlUpdateTimeout);
            }, () => {
                this.loading = false;
            });
    }

    close = (msg): void => {
        this.dialogRef.close(msg);
    };
}
