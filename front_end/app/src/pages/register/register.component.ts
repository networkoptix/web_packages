import { AfterViewInit, Component, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute }                                             from '@angular/router';
import { NxUriService }              from '../../services/uri.service';
import { TranslateService }          from '@ngx-translate/core';
import { NxRegisterService }         from '../../services/register.service';
import { NxPageService }             from '../../services/page.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxAccountService }          from '../../services/account.service';
import { LocalStorageService }       from 'ngx-store';
import { NxUrlProtocolService }      from '../../services/url-protocol.service';

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

    @ViewChild('registerForm', { static: true }) registerForm: HTMLFormElement;

    private setupDefaults() {

        this.context = {
            process : ''
        };

        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.register);

        this.register = this.process.init(() => {
            this.accountService.setEmail(this.accountInfo.email);

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
                this.accountService.login(this.accountInfo.email, this.accountInfo.password, true);
            } else {
                this.locationProxy.path('/register/success', false);
                this.accountService.setEmail(this.accountInfo.email);
                this.pageService.setPageTitle(this.LANG.pageTitles.registerSuccess);
            }
        });
    }

    constructor(@Inject('process') private process: any,
                @Inject('locationProxyService') private locationProxy: any,
                private urlProtocol: NxUrlProtocolService,
                private localStorage: LocalStorageService,
                private route: ActivatedRoute,
                private accountService: NxAccountService,
                private registerService: NxRegisterService,
                private language: NxLanguageProviderService,
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
            this.accountService.logoutAuthorised();
        } else if (this.activated) {
            this.accountService.redirectAuthorised();
        }

        if (this.code) {
            const decoded = atob(this.uriParamCode);
            this.accountInfo.email = decoded.substring(decoded.indexOf(':') + 1);
            this.lockEmail = true;
        }

        this.accountInfo = {
            email    : this.accountInfo.email || this.accountService.getEmail(),
            password : '',
            firstName: '',
            lastName : '',
            accept   : false,
            code     : this.code
        };

        if (this.registerSuccess && this.context.process !== 'registerSuccess') {
            this.accountService.redirectToHome();
        }

        this.session = this.localStorage;
        // this.context = $sessionStorage;

        this.session.set('fromClient', this.urlProtocol.getSource().isApp);
    }
}

