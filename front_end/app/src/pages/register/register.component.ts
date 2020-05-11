import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';
import { LocalStorageService }          from 'ngx-store';
import {
    NxPageService, NxAccountService,
    NxLanguageProviderService,
    NxUrlProtocolService, NxUriService,
    NxProcessService, NxCloudApiService,
    NxConfigService, IConfig
}                                       from '../../services';
import { NxDialogsService }             from '../../dialogs';
import { LanguageI18NStaticTypes }      from '../../../language_i18n_static_types';

@Component({
    selector    : 'nx-register-component',
    templateUrl : 'register.component.html',
    styleUrls   : ['register.component.scss']
})

export class NxRegisterComponent implements OnInit {
    LANG: LanguageI18NStaticTypes;

    uriParam: string;
    accountInfo: any = {};
    register;
    registerSuccess;
    activated;
    code;
    session;
    context;
    lockEmail: boolean;
    fromClient;
    location;
    CONFIG: IConfig;

    @ViewChild('registerForm', { static: false }) registerForm: HTMLFormElement;

    private setupDefaults() {
        this.context = {
            process: ''
        };

        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.register, true);
    }

    constructor(configService: NxConfigService,
                private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private uriService: NxUriService,
                private urlProtocol: NxUrlProtocolService,
                private route: ActivatedRoute,
                private localStorage: LocalStorageService,
                private accountService: NxAccountService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                private dialogs: NxDialogsService,
                private router: Router
    ) {
        this.setupDefaults();
        this.CONFIG = configService.getConfig();
    }

    login() {
        const { url } = this.router;
        const redirect = this.CONFIG.redirect.paths.some((path) => {
            return path === '/' ? url === '/' : url.includes(path);
        });
        // Handling promise to satisfy the linter.
        this.dialogs.login(this.accountService, !redirect).then(() => {});
    }

    ngOnInit(): void {
        // Process service trigger route reload (maybe AJS? ) ... revise this after we remove AJS
        this.context.process = this.localStorage.get('regProcess');
        this.uriParam = this.route.snapshot.data.uriParam;

        if (this.route.snapshot.params.code) {
            this.code = decodeURIComponent(this.route.snapshot.params.code);
        }

        if (this.uriParam === 'registerSuccess') {
            this.registerSuccess = true;
            this.pageService.setPageTitle(this.LANG.pageTitles.registerSuccess, true);
        }

        if (this.uriParam === 'activated') {
            this.activated = true;
            this.registerSuccess = true;
        }

        if (!this.registerSuccess) {
            this.accountService.logoutAuthorised();
        } else if (this.activated) {
            this.accountService.redirectAuthorised();
            return;
        }

        if (this.code) {
            let decoded: string;
            try {
                decoded = atob(this.code);
                this.accountInfo.email = decoded.substring(decoded.indexOf(':') + 1);
                this.lockEmail = true;
            } catch (ex) {}
        }

        const loginRegister = this.localStorage.get('loginRegister');
        if (loginRegister) {
            this.lockEmail = !!loginRegister;
        }

        this.accountInfo = {
            email     : this.accountInfo.email || this.accountService.email,
            password  : '',
            firstName : '',
            lastName  : '',
            accept    : false,
            code      : this.code
        };

        if (this.registerSuccess && this.context.process !== 'registerSuccess') {
            this.accountService.redirectToHome();
            return;
        }

        this.fromClient = this.urlProtocol.getSource().isApp;

        this.localStorage.set('regProcess', undefined);

        this.register = this.processService.createProcess(() => {
            this.accountService.email = this.accountInfo.email;

            return this.cloudApiService
                .registerUser(
                    this.accountInfo.email,
                    this.accountInfo.password,
                    this.accountInfo.firstName,
                    this.accountInfo.lastName,
                    this.accountInfo.accept,
                    this.accountInfo.code);
        }, {
            errorCodes: {
                alreadyExists: () => {
                    this.registerForm.controls.registerEmail.setErrors({ alreadyExists: true });
                    this.registerForm.controls.registerEmail.markAsTouched();
                    return false;
                },
                portalError: this.LANG.errorCodes.brokenAccount
            },
            holdAlerts  : true,
            errorPrefix : this.LANG.errorCodes.cantRegisterPrefix
        })
            .then((response) => {
                if (response.resultCode === 'alreadyExists') {
                    this.registerForm.controls.registerEmail.setErrors({ alreadyExists: true });
                    return;
                }

                if (response.activated) {
                    this.uriService
                        .updateURI('/register/successActivated', {}, false)
                        .catch(error => {
                            console.error(error);
                        });

                    this.accountService
                        .login(this.accountInfo.email, this.accountInfo.password, true)
                        .then(() => {
                            this.registerSuccess = true;
                            this.activated = true;
                            this.localStorage.set('regProcess', 'registerSuccess');
                            this.localStorage.set('regActivated', 'activated');
                        });
                } else {
                    this.localStorage.remove('loginRegister');
                    this.uriService
                        .updateURI('/register/success', {}, true)
                        .catch(error => {
                            console.error(error);
                        });

                    this.accountService.email = this.accountInfo.email;
                    this.pageService.setPageTitle(this.LANG.pageTitles.registerSuccess);
                    this.registerSuccess = true;
                    this.localStorage.set('regProcess', 'registerSuccess');
                }
            });
    }
}
