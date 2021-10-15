import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router }       from '@angular/router';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxAccountService }          from '@services/account.service';
import { NxPageService }             from '@services/page.service';
import { NxProcessService, Process } from '@services/process.service';
import { NxCloudApiService }         from '@services/nx-cloud-api';
import { NxUriService }              from '@services/uri.service';
import { NxUrlProtocolService }      from '@services/url-protocol.service';
import { NxDialogsService }          from '@dialogs/dialogs.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxStorageService }          from '@services/storage.service';
import { NxSessionService }          from '@services/session.service';

@Component({
    selector: 'nx-register-component',
    templateUrl: 'register.component.html',
    styleUrls: ['register.component.scss']
})

export class NxRegisterComponent implements OnInit {
    LANG: LanguageI18NStaticTypes;

    uriParamLogout: string;
    uriParam: string;
    accountInfo: any = {};
    register: Process;
    registerSuccess;
    activated;
    code;
    session;
    context;
    lockEmail: boolean;
    fromClient;
    location;
    CONFIG: IConfig;
    hideErrors = true;

    @ViewChild('registerForm', { static: false }) registerForm: HTMLFormElement;

    private setupDefaults() {
        this.context = {
            process: ''
        };

        this.pageService.pageTitleRemoveHyphen = this.LANG.pageTitles.register;
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private sessionService: NxSessionService,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private uriService: NxUriService,
        private urlProtocol: NxUrlProtocolService,
        private route: ActivatedRoute,
        private storageService: NxStorageService,
        public accountService: NxAccountService,
        private pageService: NxPageService,
        private dialogs: NxDialogsService,
        private router: Router
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();

        this.setupDefaults();
    }

    login() {
        const { url } = this.router;
        const redirect = this.CONFIG.redirect.paths.some((path) => {
            return path === '/' ? url === '/' : url.includes(path);
        });
        this.accountService.showLogin(!redirect);
    }

    async ngOnInit() {
        this.uriParamLogout = this.route.snapshot.queryParams.logout;
        if (this.uriParamLogout !== undefined) {
            if (this.sessionService.loginState) {
                await this.accountService.logout(true);
            }
            this.sessionService.email = '';
        }

        // Process service trigger route reload (maybe AJS? ) ... revise this after we remove AJS
        this.context.process = this.storageService.regProcess;
        this.uriParam = this.route.snapshot.data.uriParam;

        if (this.route.snapshot.params.code) {
            this.code = decodeURIComponent(this.route.snapshot.params.code);
        }

        if (this.uriParam === 'registerSuccess') {
            this.registerSuccess = true;
            this.pageService.pageTitleRemoveHyphen = this.LANG.pageTitles.registerSuccess?.();
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

        const loginRegister = this.storageService.loginRegister;
        if (loginRegister) {
            this.lockEmail = !!loginRegister;
        }

        this.accountInfo = {
            email: this.lockEmail ? this.accountInfo.email || this.accountService.email : '',
            password: '',
            firstName: '',
            lastName: '',
            accept: false,
            code: this.code
        };

        if (this.registerSuccess && this.context.process !== 'registerSuccess') {
            this.accountService.redirectToHome();
            return;
        }

        this.fromClient = this.urlProtocol.getSource().isApp;

        this.storageService.clear = 'regProcess';

        this.register = this.processService.createProcess(() => {
            this.accountService.email = this.accountInfo.email;
            return this.cloudApiService
                .registerUser(
                    this.accountInfo.email,
                    this.accountInfo.password,
                    this.accountInfo.firstName,
                    this.accountInfo.lastName,
                    this.accountInfo.code);
        }, {
            errorCodes: {
                alreadyExists: () => {
                    this.registerForm.controls.registerEmail.setErrors({ alreadyExists: true });
                    this.registerForm.controls.registerEmail.markAsTouched();
                    return false;
                },
                portalError: this.LANG.errorCodes.brokenAccount?.()
            },
            holdAlerts: true,
            errorPrefix: ''
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
                        .login(this.accountInfo.email, this.accountInfo.password, true, true)
                        // @ts-ignore -- TODO: Need to exclude this from webadmin routes
                        .then(() => {
                            this.registerSuccess = true;
                            this.activated = true;
                            this.storageService.regProcess = this.registerSuccess;
                            this.storageService.regActivated = this.activated;
                        });
                } else {
                    this.storageService.clear = 'loginRegister';
                    this.uriService
                        .updateURI('/register/success', {}, true)
                        .catch(error => {
                            console.error(error);
                        });

                    this.accountService.email = this.accountInfo.email;
                    this.pageService.pageTitle = this.LANG.pageTitles.registerSuccess?.();
                    this.registerSuccess = true;
                    this.storageService.regProcess = 'registerSuccess';
                }
            });
    }
}
