import {
    Component, Inject,
    Input, OnInit, ViewChild
}                                    from '@angular/core';
import { ActivatedRoute }            from '@angular/router';
import { NxPageService }             from '../../services/page.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxAccountService }          from '../../services/account.service';
import { LocalStorageService }       from 'ngx-store';
import { NxUrlProtocolService }      from '../../services/url-protocol.service';
import { NxProcessService }          from '../../services/process.service';
import { NxUriService }              from '../../services/uri.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';

@Component({
    selector   : 'nx-register-component',
    templateUrl: 'register.component.html',
    styleUrls  : ['register.component.scss']
})

export class NxRegisterComponent implements OnInit {

    @Input() uriParamCode;

    LANG: any = {};

    mode: string;
    accountInfo: any = {};
    register: any;
    registerSuccess: any;
    activated: any;
    code: any;
    session: any;
    context: any;
    lockEmail: boolean;

    @ViewChild('registerForm', { static: false }) registerForm: HTMLFormElement;

    private setupDefaults() {
        this.context = {
            process : ''
        };

        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.register);

        this.register = this.processService.createProcess(() => {
            this.accountService.setEmail(this.accountInfo.email);

            return this.cloudApiService
                       .registerUser(
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
                    this.registerForm.controls.registerEmail.markAsTouched();
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
                this.uriService.updateURI('/register/successActivated', {}, false);
                this.accountService
                    .login(this.accountInfo.email, this.accountInfo.password, true)
                    .then(() => {
                        this.registerSuccess = true;
                        this.activated = true;
                    });
            } else {
                this.uriService.updateURI('/register/success', {}, false);
                setTimeout(() => {
                    this.accountService.setEmail(this.accountInfo.email);
                    this.pageService.setPageTitle(this.LANG.pageTitles.registerSuccess);
                    this.registerSuccess = true;
                });
            }
        });
    }

    constructor(private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private uriService: NxUriService,
                private urlProtocol: NxUrlProtocolService,
                private localStorage: LocalStorageService,
                private route: ActivatedRoute,
                private accountService: NxAccountService,
                private language: NxLanguageProviderService,
                private pageService: NxPageService) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.mode = this.route.snapshot.data.uriParam;
        if (this.route.snapshot.params.code) {
            this.code = this.route.snapshot.params.code;
        }

        if (this.mode === 'registerSuccess') {
            this.registerSuccess = true;
        }

        if (this.mode === 'activated') {
            this.activated = true;
            this.registerSuccess = true;
        }

        if (!this.registerSuccess) {
            this.accountService.logoutAuthorised();
        } else if (this.activated) {
            this.accountService.redirectAuthorised();
        }

        if (this.code) {
            let decoded;
            try {
                decoded = atob(this.uriParamCode);
                this.accountInfo.email = decoded.substring(decoded.indexOf(':') + 1);
                this.lockEmail = true;
            } catch (ex) {}
        }

        // TODO: UNCOMMENT after done with test data
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
            return;
        }

        this.session = this.localStorage;
        // this.context = $sessionStorage;

        this.session.set('fromClient', this.urlProtocol.getSource().isApp);
        this.session.fromClient = this.urlProtocol.getSource().isApp;
    }

    init() {

    }
}

