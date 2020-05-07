import {
    Component, Inject, OnInit,
    Input, ViewChild, Renderer2
}                                    from '@angular/core';
import { DOCUMENT, Location }        from '@angular/common';
import { Router }                    from '@angular/router';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { LocalStorageService }       from 'ngx-store';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxUtilsService }            from '../../services/utils.service';
import { NxAccountService }          from '../../services/account.service';
import { NxProcessService, Process } from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import { NxModalGenericComponent }   from '../generic/generic.component';
import { NxDialogsService }          from '../dialogs.service';
import { NxApplyService }            from '../../services/apply.service';

@Component({
    selector    : 'ngbd-modal-content',
    templateUrl : 'login.component.html',
    styleUrls   : []
})
export class LoginModalContent implements OnInit {
    @Input() account: NxAccountService;
    @Input() login: Process;
    @Input() cancellable;
    @Input() closable;
    @Input() keepPage;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    locationService: Location;
    auth: any;
    next: string;
    password: string;
    remember: boolean;

    wrongPassword: boolean;
    accountBlocked: boolean;

    @ViewChild('loginForm', { static: true }) loginForm: HTMLFormElement;

    private setupDefaults() {
        this.auth = { email: this.localStorage.get('email') };
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
        private cloudApiService: NxCloudApiService,
        private localStorage: LocalStorageService,
        private genericModal: NxModalGenericComponent,
        private renderer: Renderer2,
        private router: Router,
        public activeModal: NgbActiveModal,
        @Inject(DOCUMENT) private document: any
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
        this.locationService = locationService;

        this.setupDefaults();
    }

    resendActivation(email) {
        this.activeModal.close();

        this.processService.createProcess(() => {
            return this.cloudApiService.reactivate(email);
        }, {
            errorCodes: {
                forbidden : this.LANG.errorCodes.accountAlreadyActivated,
                notFound  : this.LANG.errorCodes.emailNotFound
            },
            holdAlerts  : true,
            errorPrefix : this.LANG.errorCodes.cantSendConfirmationPrefix
        })
            .run()
            .then(() => {
                this.genericModal.openConfirm(
                    'Check your inbox and visit provided link to activate account',
                    'Activation email sent',
                    'OK');
            });
    }

    resetForm() {
        const { errors } = this.loginForm.controls.login_email;
        if (errors) {
            delete errors.not_activated;
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
        this.localStorage.set('email', this.auth.email);
    }

    ngOnInit() {
        // Check the url queryParams for next. if it exists set next equal to it.
        const nextUrl = /\?next=(.*)/.exec(this.document.location.search.replace(/%2F/g, '/'));
        if (nextUrl && nextUrl.length > 1) {
            this.next = nextUrl[1];
        }
        this.password = '';

        this.login = this.processService.createProcess(() => {
            this.loginForm.controls.login_email.setErrors(undefined);
            this.loginForm.controls.login_password.setErrors(undefined);
            this.wrongPassword = false;
            this.accountBlocked = false;

            return this.account.login(this.auth.email, this.password, this.remember);
        }, {
            ignoreUnauthorized : true,
            errorCodes         : {
                accountNotActivated: () => {
                    this.password = '';
                    this.loginForm.controls.login_password.markAsPristine();
                    this.loginForm.controls.login_password.markAsUntouched();

                    this.loginForm.controls.login_email.setErrors({ not_activated: true });
                    this.renderer.selectRootElement('#login_email').select();
                },
                notAuthorized: () => {
                    this.wrongPassword = true;
                    this.loginForm.controls.login_password.setErrors({ nx_wrong_password: true });
                    this.password = '';

                    this.renderer.selectRootElement('#login_password').focus();
                },
                notFound: () => {
                    this.password = '';
                    this.loginForm.controls.login_password.markAsPristine();
                    this.loginForm.controls.login_password.markAsUntouched();

                    this.loginForm.controls.login_email.setErrors({ no_user: true });
                    this.renderer.selectRootElement('#login_email').select();
                },
                accountBlocked: () => {
                    this.loginForm.controls.login_password.markAsPristine();
                    this.loginForm.controls.login_password.markAsUntouched();

                    this.accountBlocked = true;
                    this.loginForm.controls.login_password.setErrors({ nx_account_blocked: true });
                },
                wrongParameters: () => {
                },
                portalError: this.LANG.errorCodes.brokenAccount
            }
        }).then((result) => {
            this.activeModal.close();
            const isRootPath = ['/', ''].includes(this.locationService.path());

            if (this.keepPage) {
                if (isRootPath) {
                    this.router
                        .navigate([this.CONFIG.redirect.authorised])
                        .then(() => {
                            // ensure language reload as translations are loaded on page load
                            window.location.reload();
                        });
                } else {
                    // TODO: remove window reload once we separate session state from account service
                    window.location.reload();
                }
            } else if (this.next) {
                // sanitize this.next
                this.next = NxUtilsService.getRelativeLocation(this.next);
                this.router
                    .navigate([this.next])
                    .then(() => {
                        // *** window.location.reload(); // ensure language reload as translations are loaded on page load
                        // *** admin section is not a part of Angular project
                        window.location.href = this.next;
                    });
            } else {
                setTimeout(() => {
                    this.router
                        .navigate([this.CONFIG.redirect.authorised], { replaceUrl: isRootPath })
                        .then(() => {
                            // ensure language reload as translations are loaded on page load
                            window.location.reload();
                        });
                });
            }
        }, (error) => {
            if (error.resultCode === 'portalError') {
                // close dialog ... process will show toaster
                this.activeModal.close();
            }
        });
    }

    close() {
        // prevent unnecessary reload
        this.activeModal.close('canceled');
        if (!this.keepPage) { // && this.accountService.email === undefined) {
            return this.router.navigate([this.CONFIG.redirect.unauthorised]);
        }
    }
}
