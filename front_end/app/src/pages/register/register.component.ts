import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute }                       from '@angular/router';
import { NxUriService }                         from '../../services/uri.service';
import { TranslateService }                     from '@ngx-translate/core';
import { NxRegisterService }                    from '../../services/register.service';
import { NxPageService }                        from '../../services/page.service';

@Component({
    selector   : 'nx-register-component',
    templateUrl: 'register.component.html',
    styleUrls  : ['register.component.scss']
})

export class NxRegisterComponent implements OnInit {
    LANG: any = {};
    accountInfo: any = {};
    // register: any;
    registerSuccess: any;
    activated: any;
    session: any;
    context: any;
    lockEmail: boolean;
    registerEmail: string;

    @ViewChild('registerForm') registerForm: HTMLFormElement;

    private setupDefaults() {
        this.LANG = undefined;
        this.registerEmail = undefined;

        this.translate
            .getTranslation(this.translate.currentLang)
            .subscribe((lang) => {
                this.LANG = lang;
                this.pageService.setPageTitle(this.LANG.pageTitles.register);
            });
    }

    constructor(@Inject('account') private account: any,
                @Inject('process') private process: any,
                @Inject('urlProtocol') private urlProtocol: any,
                @Inject('localStorageService') private localStorage: any,
                @Inject('authorizationCheckService') private authorizationService: any,
                private route: ActivatedRoute,
                private registerService: NxRegisterService,
                private uri: NxUriService,
                private translate: TranslateService,
                private pageService: NxPageService) {
        this.setupDefaults();
    }

    ngOnInit(): void {


        this.route.params.subscribe(params => {
            this.registerSuccess = params.registerSuccess;
            this.activated = params.activated;

            if (!this.registerSuccess) {
                this.authorizationService.logoutAuthorised();
            } else if (this.activated) {
                this.authorizationService.redirectAuthorised();
            }

            if (params.code) {
                const decoded = atob(params.code);
                this.registerEmail = decoded.substring(decoded.indexOf(':') + 1);
                this.lockEmail = true;
            }

            this.accountInfo = {
                email    : this.registerEmail || this.account.getEmail(),
                password : '',
                firstName: '',
                lastName : '',
                subscribe: true,
                code     : params.code
            };

            if (this.registerSuccess && this.context.process !== 'registerSuccess') {
                this.pageService.setPageTitle(this.LANG.pageTitles.registerSuccess);
                this.authorizationService.redirectToHome();
            }
        });

        this.session = this.localStorage;
        // this.context = $sessionStorage;

        this.session.fromClient = this.urlProtocol.source.isApp;
    }

    register() {
        this.process.init(() => {
            this.account.setEmail(this.accountInfo.email);
            return this.registerService
                       .register(
                           this.accountInfo.email,
                           this.accountInfo.password,
                           this.accountInfo.firstName,
                           this.accountInfo.lastName,
                           this.accountInfo.subscribe,
                           this.accountInfo.code);
                       }, {
                           errorCodes : {
                               alreadyExists: error => {
                                   this.registerForm.registerEmail.$setValidity('alreadyExists', false);
                                   this.registerForm.registerEmail.$setTouched();
                                   return false;
                               },
                               portalError  : this.LANG.errorCodes.brokenAccount
                           },
                           holdAlerts : true,
                           errorPrefix: this.LANG.errorCodes.cantRegisterPrefix
                       })
                       .run()
                       .then(() => {
                            this.context.process = 'registerSuccess';
                            this.registerSuccess = true;

                            if (this.accountInfo.code) {
                                this.activated = true;
                                this.uri.updateURI('/register/successActivated', {});
                                this.authorizationService.login(this.accountInfo.email, this.accountInfo.password);
                            } else {
                                this.uri.updateURI('/register/success', {});
                                this.account.setEmail(this.accountInfo.email);
                            }
                       });
    }

    hideAlreadyExists(ctrl) {
        // ctrl.$setValidity('alreadyExists', true);
    }
}

