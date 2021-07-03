import {
    Component, Inject, OnInit,
    Input, ViewChild, Renderer2
}                                    from '@angular/core';
import { DOCUMENT, Location }        from '@angular/common';
import { Router }                    from '@angular/router';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';

import { NxModalGenericComponent }   from '../generic/generic.component';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxUtilsService }            from '@services/utils.service';
import { NxProcessService }          from '@services/process.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxStorageService }          from '@services/storage.service';
import { WINDOW }                    from '@services/window-provider';
import { CookieService }             from 'ngx-cookie-service';
import { NxAppStateService }         from '@services/nx-app-state.service';

@Component({
    selector    : 'nx-login-webadmin-modal',
    templateUrl : 'login-webadmin.component.html',
    styleUrls   : ['login-webadmin.component.scss']
})
export class LoginWebadminModalContent implements OnInit {
    @Input() account;
    @Input() login;
    @Input() keepPage;
    @Input() blockNavigation;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    locationService: Location;
    auth;
    next: string;
    password: string;
    remember: boolean;
    hideErrors: boolean = true;

    wrongPassword: boolean;
    accountBlocked: boolean;

    @ViewChild('loginForm', { static: true }) loginForm: HTMLFormElement;

    private setupDefaults() {
        this.auth = { email: this.storageService.email };
        this.next = '';
        this.password = '';
        this.remember = true;
        this.wrongPassword = false;
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        locationService: Location,
        private processService: NxProcessService,
        private storageService: NxStorageService,
        private appStateService: NxAppStateService,
        private genericModal: NxModalGenericComponent,
        private renderer: Renderer2,
        private router: Router,
        private cookieService: CookieService,
        public activeModal: NgbActiveModal,
        @Inject(DOCUMENT) private document: any,
        @Inject(WINDOW) protected window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.locationService = locationService;

        this.setupDefaults();
    }

    resendActivation(email) {
        this.activeModal.close();

        this.processService.createProcess(() => {
            return this.account.reactivate(email);
        }, {
            errorCodes: {
                forbidden : this.LANG.errorCodes.accountAlreadyActivated(),
                notFound  : this.LANG.errorCodes.emailNotFound()
            },
            holdAlerts  : true,
            errorPrefix : this.LANG.errorCodes.cantSendConfirmationPrefix()
        });
    }

    resetForm() {
        const { errors } = this.loginForm.controls.login_email;
        if (errors) {
            this.loginForm.controls.login_email.setErrors(Object.keys(errors).length ? errors : undefined);
        }
        if (!this.loginForm.valid) {
            this.loginForm.controls.login_password.setErrors(undefined);
            this.wrongPassword = false;
            this.accountBlocked = false;
        }
    }

    setEmail(email) {
        this.auth.email = email;
        this.storageService.email = this.auth.email;
    }

    ngOnInit() {
        const url = new URL(this.document.location.href.replace('#/', ''));
        const params = new URLSearchParams(url.search);
        const code = params.get('code');
        if (code) {
            this.oauthLogin(code);
        }
        // remove leftover cookie
        this.cookieService.delete('x-runtime-guid');
        // Check the url queryParams for next. if it exists set next equal to it.
        const nextUrl = /\?next=(.*)/.exec(this.document.location.search.replace(/%2F/g, '/'));
        if (nextUrl && nextUrl.length > 1) {
            this.next = nextUrl[1];
        }
        this.password = '';
        const showWrongLoginError = () => {
            this.wrongPassword = true;
            this.loginForm.controls.login_password.setErrors({ nx_wrong_password: true });
            this.password = '';
            this.renderer.selectRootElement('#login_password').focus();
        };

        this.login = this.processService.createProcess(() => {
            this.loginForm.controls.login_email.setErrors(undefined);
            this.loginForm.controls.login_password.setErrors(undefined);
            this.wrongPassword = false;
            this.accountBlocked = false;

            return this.account.login(this.auth.email, this.password, this.remember);
        }, {
            ignoreUnauthorized : true,
            errorCodes         : {
                'This user does not exist.' : showWrongLoginError,
                notAuthorized               : showWrongLoginError,
                accountBlocked              : () => {
                    this.loginForm.controls.login_password.markAsPristine();
                    this.loginForm.controls.login_password.markAsUntouched();

                    this.accountBlocked = true;
                    this.loginForm.controls.login_password.setErrors({ nx_account_blocked: true });
                }
            }
        }, (result) => {
            this.activeModal.close(result);
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
                this.next = NxUtilsService.getRelativeLocation(this.next);
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
                        .navigate([this.CONFIG.redirect.authorised], { replaceUrl: isRootPath })
                        .then(() => {
                            // ensure language reload as translations are loaded on page load
                            this.window.location.reload();
                        });
                });
            }
        }, (error) => {
            console.error(error);
        });
    }

    redirectOauthLogin() {
        this.account.mediaServerApi.redirectOauth();
    }

    oauthLogin(code: string) {
        this.account.mediaServerApi.loginOauth(code).subscribe(() => {
            this.window.location.href = this.window.location.origin;
        });
    }
}
