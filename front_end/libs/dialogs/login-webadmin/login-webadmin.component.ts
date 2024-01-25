import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule, Location } from '@angular/common';
import { Component, Inject, OnInit, Renderer2, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CookieService } from 'ngx-cookie-service';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { LoginWebAdmin as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import staticLang from '@language_static';
import { PipesModule } from '@pipes/pipes.module';
import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { OauthService } from '@services/oauth.service';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { LOGIN_STATE } from '@services/session.service.types';
import { NxStorageService } from '@services/storage.service';
import { NxToastService } from '@services/toast.service';
import { icons, redirect } from '@static-variables';

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
    const match = href.match(
        /^(https?:)?\/\/(([^:\/?#]*)(?::([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*|)$/,
    );
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
    styleUrls: ['login-webadmin.component.scss'],
    standalone: true,
    imports: [
        NxPreLoaderComponent,
        AngularSvgIconModule,
        NxProcessButtonComponent,
        PipesModule,
        TranslateModule,
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NxAddSvgSrcDirective,
        NxFocusMeDirective,
    ],
})
export class LoginWebadminModalContent extends ModalBase<DT['return']> implements OnInit {
    LANG = staticLang;
    CONFIG: IConfig;

    loading: boolean = true;

    auth: { email: string };
    login: Process;
    private next: string;
    password: string;
    hideErrors: boolean = true;

    wrongCredentials: boolean;
    accountBlocked: boolean;
    accountNotOnSystem: boolean;
    account2faRequired: boolean;
    icons = icons;

    readonly urlUpdateTimeout: number = 150;

    @ViewChild('loginForm', { static: false }) private loginForm: NgForm;

    private setupDefaults(): void {
        this.auth = { email: this.storageService.email };
        this.next = '';
        this.password = '';
        this.wrongCredentials = false;
    }

    constructor(
        configService: NxConfigService,

        private location: Location,
        private account: NxAccountService,
        public oauthService: OauthService,
        private renderer: Renderer2,
        private processService: NxProcessService,
        private storageService: NxStorageService,
        private toastService: NxToastService,
        private router: Router,
        private cookieService: CookieService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private keepPage: DT['data'],
    ) {
        super(dialogRef);
        this.CONFIG = configService.getConfig();

        this.setupDefaults();
    }

    private removeParamFromUrl(
        url: URL,
        hash: string,
        params: URLSearchParams,
        paramName: string,
    ): void {
        params.delete(paramName);
        const paramString = params.toString();
        url.hash = hash + (paramString ? '?' + paramString : '');
        window.location.href = url.toString();
    }

    private displayCloudConnectionError(): void {
        this.toastService.show(this.LANG.toastMessage.noInternet, ToastType.Warning);
    }

    resetForm(): void {
        if (!this.loginForm.valid) {
            this.loginForm.controls.login_email.setErrors(undefined);
            this.loginForm.controls.login_password.setErrors(undefined);
            this.wrongCredentials = false;
            this.accountBlocked = false;
        }
    }

    checkFormErrors = (): void => {
        if (!this.loginForm.valid) {
            this.wrongCredentials = true;
        }
    };

    setEmail(email: string): void {
        this.auth.email = email;
        this.storageService.email = this.auth.email;
    }

    ngOnInit(): void {
        const url = new URL(document.location.href);
        if (url.search) {
            const { origin } = document.location;
            document.location.href = document.location.href.replace(origin, `${origin}/#`);
            url.hash = `${url.hash}?${url.search}`;
        }
        const [hash, query] = url.hash.split('?');
        const params = new URLSearchParams(query || '');
        const auth = params.get('auth');
        const code = params.get('code');
        const token = params.get('token');
        if (code) {
            this.removeParamFromUrl(url, hash, params, 'code');
            this.oauthLogin(code);
            return;
        } else if (token || auth) {
            if (token) {
                this.removeParamFromUrl(url, hash, params, 'token');
            }
            if (auth) {
                this.removeParamFromUrl(url, hash, params, 'auth');
            }
            this.tokenLogin(token || auth);

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
        const nextUrl = /\?next=(.*)/.exec(document.location.search.replace(/%2F/g, '/'));
        if (nextUrl && nextUrl.length > 1) {
            this.next = nextUrl[1];
        }
        this.password = '';

        const showAccountBlockedError = (): void => {
            this.loginForm.controls.login_password.markAsPristine();
            this.loginForm.controls.login_password.markAsUntouched();

            this.accountBlocked = true;
            this.loginForm.controls.login_password.setErrors({
                nx_account_blocked: true,
            });
        };

        const showWrongCredentialsError = (): void => {
            this.password = '';
            this.wrongCredentials = true;
            this.loginForm.controls.login_email.setErrors({
                nx_wrong_credentials: true,
            });
            this.loginForm.controls.login_password.setErrors({
                nx_wrong_credentials: true,
            });
            this.renderer.selectRootElement('#login_password').focus();
        };

        const showUserDisabled = (): void => {
            this.toastService.show(this.LANG.toastMessage.userDisabled, ToastType.Danger);
        };

        const cloudLogin =
            this.LANG.errorCodes[
                'This authorization method is forbidden. Please contact your system administrator.'
            ];
        const errorCodes = {
            notFound: showWrongCredentialsError,
            invalidParameter: showWrongCredentialsError,
            serviceUnavailable: showAccountBlockedError,
            forbidden: showUserDisabled,
        };
        errorCodes[cloudLogin] = () => this.LANG.toastMessage.webAdminCloudCredentialError;
        this.login = this.processService.createProcess(
            () => {
                this.setEmail(this.loginForm.controls.login_email.value);
                this.loginForm.controls.login_email.setErrors(undefined);
                this.loginForm.controls.login_password.setErrors(undefined);
                this.wrongCredentials = false;
                this.accountBlocked = false;

                return this.account.login(this.auth.email, this.password, true);
            },
            {
                ignoreUnauthorized: true,
                errorCodes,
            },
            _ => {
                this.close();
                const isRootPath = ['/', ''].includes(this.location.path());

                if (this.keepPage) {
                    if (isRootPath) {
                        this.router.navigate([redirect.authorised]);
                    } else {
                        // TODO: remove window reload once we separate session state from account service
                        window.location.reload();
                    }
                } else if (this.next) {
                    // sanitize this.next
                    this.next = getRelativeLocation(this.next);
                    this.router.navigate([this.next]).then(() => {
                        // *** window.location.reload(); // ensure language reload as translations are loaded on page load
                        // *** admin section is not a part of Angular project
                        window.location.href = this.next;
                    });
                } else {
                    setTimeout(() => {
                        this.router
                            .navigate([redirect.authorised], { replaceUrl: isRootPath })
                            .then(() => {
                                // ensure language reload as translations are loaded on page load
                                window.location.reload();
                            });
                    });
                }
            },
            error => {
                if (!Object.keys(errorCodes).includes(error?.resultCode)) {
                    console.error(error);
                }
            },
        );
    }

    redirectOauthLogin(): void {
        this.account.mediaServerApi.getServerInfo('*').subscribe(
            data => {
                const systemHasInternet = data.some(system =>
                    system.serverFlags.includes('SF_HasPublicIP'),
                );
                if (navigator.onLine && systemHasInternet) {
                    this.account.mediaServerApi.redirectOauth();
                } else {
                    this.displayCloudConnectionError();
                }
            },
            () => this.displayCloudConnectionError(),
        );
    }

    oauthLogin(code: string): void {
        this.account.mediaServerApi.loginOauth(code).subscribe(res => {
            this.storageService.system2faEnabled = false;
            this.accountNotOnSystem = res.scope === '';

            if (!this.accountNotOnSystem && res.error === 'second_factor_required') {
                this.storageService.system2faEnabled = true;
                this.oauthService.redirectOauth({
                    state: 'system2faAuth',
                    email: '',
                    code,
                    accessToken: res.access_token,
                    redirectTo: window.location.href,
                });
                return;
            }

            this.account2faRequired = res.error === '2fa_disabled_for_the_user';
            this.loading = !(this.accountNotOnSystem || this.account2faRequired);

            if (!this.accountNotOnSystem && !this.account2faRequired) {
                this.account
                    .get(true)
                    .then(
                        res => {
                            if (res) {
                                window.location.reload();
                            } else {
                                this.loading = false;
                                this.displayCloudConnectionError();
                            }
                        },
                        err => {
                            if (err.errorString === 'user is disabled') {
                                this.toastService.show(
                                    this.LANG.toastMessage.userDisabled,
                                    ToastType.Danger,
                                );
                            }
                        },
                    )
                    .finally(() => {
                        this.close(true);
                    });
            }
        });
    }

    tokenLogin(token: string): void {
        this.account.mediaServerApi.loginTokenUrl(token).subscribe(
            () => {
                this.account.mediaServerApi.getCurrentUser().then(account => {
                    this.account.loginState =
                        account.email || account.name
                            ? LOGIN_STATE.AUTHORIZED
                            : LOGIN_STATE.UNAUTHORIZED;
                    // If the page reloads too soon. Webadmin redirects to /
                    setTimeout(() => window.location.reload(), this.urlUpdateTimeout);
                });
            },
            () => {
                this.loading = false;
            },
        );
    }
}
