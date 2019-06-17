import { AfterViewInit, Component, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute }                                             from '@angular/router';
import { NxUriService }                                               from '../../services/uri.service';
import { TranslateService }                                           from '@ngx-translate/core';
import { NxRegisterService }                                          from '../../services/register.service';
import { NxPageService }                                              from '../../services/page.service';

@Component({
    selector   : 'nx-register-component',
    templateUrl: 'register.component.html',
    styleUrls  : ['register.component.scss']
})

export class NxRegisterComponent implements OnInit {

    @Input() uriParam;
    @Input() uriParamCode;

    LANG: any = {};
    accountInfo: any = {};
    register: any;
    registerSuccess: any;
    activated: any;
    code: any;
    session: any;
    context: any;
    lockEmail: boolean;

    @ViewChild('registerForm') registerForm: HTMLFormElement;

    private setupDefaults() {

        this.context = {
            process : ''
        };

        this.translate
            .getTranslation(this.translate.currentLang)
            .subscribe((lang) => {
                this.LANG = lang;
                this.pageService.setPageTitle(this.LANG.pageTitles.register);

                this.register = this.process.init(() => {
                    this.account.setEmail(this.accountInfo.email);

                    return this.registerService
                               .register(
                                       this.accountInfo.email,
                                       this.accountInfo.password,
                                       this.accountInfo.firstName,
                                       this.accountInfo.lastName,
                                       this.accountInfo.accept,
                                       this.accountInfo.code);
                }, {
                    errorCodes : {
                        alreadyExists: error => {
                            this.registerForm.controls.registerEmail.setErrors({ alreadyExists: true });
                            this.registerForm.registerEmail.$setTouched();
                            return false;
                        },
                        portalError  : this.LANG.errorCodes.brokenAccount
                    },
                    holdAlerts : true,
                    errorPrefix: this.LANG.errorCodes.cantRegisterPrefix
                })
                .then((response) => {
                    if (response.resultCode === 'alreadyExists') {
                        this.registerForm.controls.registerEmail.setErrors({ alreadyExists: true });
                        return;
                    }
                    this.context.process = 'registerSuccess';
                    this.registerSuccess = true;

                    if (this.accountInfo.code) {
                        this.activated = true;
                        this.locationProxy.path('/register/successActivated', false);
                        this.authorizationService.login(this.accountInfo.email, this.accountInfo.password);
                    } else {
                        this.locationProxy.path('/register/success', false);
                        this.account.setEmail(this.accountInfo.email);
                        this.pageService.setPageTitle(this.LANG.pageTitles.registerSuccess);
                    }
                });
            });
    }

    constructor(@Inject('account') private account: any,
                @Inject('process') private process: any,
                @Inject('urlProtocol') private urlProtocol: any,
                @Inject('localStorageService') private localStorage: any,
                @Inject('authorizationCheckService') private authorizationService: any,
                @Inject('locationProxyService') private locationProxy: any,
                private route: ActivatedRoute,
                private registerService: NxRegisterService,
                private translate: TranslateService,
                private pageService: NxPageService) {
        this.setupDefaults();
    }

    ngOnInit(): void {

        if (this.uriParam === 'registerSuccess') {
            this.registerSuccess = true;
        }

        if (this.uriParam === 'activated') {
            this.activated = true;
        }

        if (this.uriParam === 'code') {
            this.code = this.uriParamCode;
        }

        if (this.uriParam === 'successActivated') {
            this.registerSuccess = true;
            this.activated = true;
        }

        if (!this.registerSuccess) {
            this.authorizationService.logoutAuthorised();
        } else if (this.activated) {
            this.authorizationService.redirectAuthorised();
        }

        if (this.code) {
            const decoded = atob(this.uriParamCode);
            this.accountInfo.email = decoded.substring(decoded.indexOf(':') + 1);
            this.lockEmail = true;
        }

        this.accountInfo = {
            email    : this.accountInfo.email || this.account.getEmail(),
            password : '',
            firstName: '',
            lastName : '',
            accept   : false,
            code     : this.code
        };

        if (this.registerSuccess && this.context.process !== 'registerSuccess') {
            this.authorizationService.redirectToHome();
        }

        this.session = this.localStorage;
        // this.context = $sessionStorage;

        this.session.fromClient = this.urlProtocol.source.isApp;
    }
}

