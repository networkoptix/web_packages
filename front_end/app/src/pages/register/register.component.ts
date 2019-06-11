import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute }                       from '@angular/router';
import { NxCloudApiService }                    from '../../services/nx-cloud-api';
import { NxLanguageProviderService }            from '../../services/nx-language-provider';
import { NxUriService }                         from '../../services/uri.service';
import { TranslateService }                     from '@ngx-translate/core';

@Component({
    selector   : 'register-component',
    templateUrl: 'register.component.html',
    styleUrls  : [ 'register.component.scss' ]
})

export class NxRegisterComponent implements OnInit {
    LANG: any = {};
    accountInfo: any = {};
    register: any;
    registerSuccess: any;
    activated: any;
    session: any;
    context: any;
    lockEmail: boolean;
    registerEmail: string;

    @ViewChild('registerForm') registerForm: HTMLFormElement;

    private setupDefaults() {
        this.registerEmail = undefined;
    }

    constructor(@Inject('cloudApiService') private cloudApi: any,
                @Inject('account') private account: any,
                @Inject('process') private process: any,
                @Inject('urlProtocol') private urlProtocol: any,
                @Inject('localStorageService') private localStorage: any,
                @Inject('authorizationCheckService') private authorizationService: any,
                private route: ActivatedRoute,
                private api: NxCloudApiService,
                private uri: NxUriService,
                private translate : TranslateService,
                private language: NxLanguageProviderService) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.language
            .translationsSubject
            .subscribe((lang) => {
                this.LANG = lang;
            });

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
                this.authorizationService.redirectToHome();
            }
        });

        this.session = this.localStorage;
        // this.context = $sessionStorage;

        this.session.fromClient = this.urlProtocol.source.isApp;

        this.register = this.process.init(function () {
            this.account.setEmail(this.accountInfo.email);
            return this.api.register(
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
                portalError  : this.LANG[this.translate.currentLang].errorCodes.brokenAccount
            },
            holdAlerts : true,
            errorPrefix: this.LANG[this.translate.currentLang].errorCodes.cantRegisterPrefix
        }).then(function () {
            this.context.process = 'registerSuccess';
            this.registerSuccess = true;

            if (this.accountInfo.code) {
                this.activated = true;
                this.uri.updateURI('/register/successActivated', {}, true);
                this.authorizationService.login(this.accountInfo.email, this.accountInfo.password);
            } else {
                this.uri.updateURI('/register/success', {}, true);
                this.account.setEmail(this.accountInfo.email);
            }
        });
    }

    hideAlreadyExists(ctrl) {
        // ctrl.$setValidity('alreadyExists', true);
    }
}

