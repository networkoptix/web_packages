import { Component, Inject, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router }           from '@angular/router';
import { Location }                         from '@angular/common';
import { TranslateService }                 from '@ngx-translate/core';
import { NxUriService }                     from '../../services/uri.service';
import { NxPageService }                    from '../../services/page.service';
import { NxDialogsService }                 from '../../dialogs/dialogs.service';
import { NxActivateService }                from './activate.service';

@Component({
    selector   : 'nx-activate-component',
    templateUrl: 'activate.component.html',
    styleUrls  : ['activate.component.scss']
})

export class NxActivateComponent implements OnInit {

    @Input() uriParam;
    @Input() uriParamCode;

    location: any;
    LANG: any = {};
    accountInfo: any = {};
    activate: any;
    reactivate: any;
    activated: any;
    code: any;
    session: any;
    context: any;
    loading: boolean;
    reactivating: any;
    activationSuccess: any;
    changeSuccess: any;

    private setupDefaults() {

        this.translate
            .getTranslation(this.translate.currentLang)
            .subscribe((lang) => {
                this.LANG = lang;
                this.pageService.setPageTitle(this.LANG.pageTitles.activate);

                this.activate = this.process.init(() => {
                    this.loading = true;
                    return this.activateService.activate(this.accountInfo.activateCode);
                }, {
                    errorCodes : {
                        notFound : () => {
                            this.activationSuccess = false;
                            this.loading = false;
                            return false;
                        },
                        notAuthorized : () => {
                            this.activationSuccess = false;
                            this.loading = false;
                            return false;
                        },
                        accountActivated : () => {
                            this.activationSuccess = false;
                            this.loading = false;
                            return false;
                        }
                    },
                    errorPrefix: this.LANG.errorCodes.cantActivatePrefix
                }).then(() => {
                    this.pageService.setPageTitle(this.LANG.pageTitles.activateSuccess);
                    this.setContext('activateSuccess');
                    this.activationSuccess = true;
                    this.loading = false;
                    this.dialogs.dismiss();
                    this.locationProxy.path('/activate/success', false);
                });

                this.reactivate = this.process.init(() => {
                    return this.activateService.reactivate(this.accountInfo.email);
                }, {
                    errorCodes : {
                        forbidden: this.LANG.errorCodes.accountAlreadyActivated,
                        notFound : this.LANG.errorCodes.emailNotFound
                    },
                    holdAlerts : true,
                    errorPrefix: this.LANG.errorCodes.cantSendConfirmationPrefix
                }).then(() => {
                    this.pageService.setPageTitle(this.LANG.pageTitles.activateSuccess);
                    this.dialogs.notify(this.LANG.account.activationLinkSent, 'success');
                });
            });
    }

    constructor(@Inject('account') private account: any,
                @Inject('process') private process: any,
                @Inject('urlProtocol') private urlProtocol: any,
                @Inject('localStorageService') private localStorage: any,
                @Inject('authorizationCheckService') private authorizationService: any,
                @Inject('locationProxyService') private locationProxy: any,
                private dialogs: NxDialogsService,
                private route: ActivatedRoute,
                private router: Router,
                private activateService: NxActivateService,
                private translate: TranslateService,
                private pageService: NxPageService,
                location: Location) {

        this.setupDefaults();
        this.location = location;
    }

    ngOnInit(): void {
        const param = this.uriParam;

        this.accountInfo = {
            newPassword : '',
            email       : '', // moved to init()
            activateCode: (param === 'activateCode') ? this.uriParamCode : undefined
        };

        this.reactivating = (this.uriParam === 'reactivating');

        this.activationSuccess = (this.uriParam === 'activationSuccess');
        this.changeSuccess = (this.uriParam === 'changeSuccess');

        this.loading = true;

        if (this.reactivating) {
            this.authorizationService.redirectAuthorised();
        }

        this.accountInfo.email = this.account.getEmail();

        if (this.accountInfo.activateCode) {
            this.authorizationService.logoutAuthorised();
            const code = this.accountInfo.activateCode;
            this.account
                .checkCode(code)
                .then(registered => {
                    if (!registered) {
                        // send to registration form with the code
                        // TODO: AJS and A7 routers freak out about route change *****
                        // this.router.navigate([' / register / ' + code]);
                        this.location.go('/ register / ' + code);
                    } else {
                        this.checkActivate();
                    }
                }, () => {
                    // Wrong activation code or some error - do nothing, keep user on this page
                    this.checkActivate();
                });
        }
    }

    private setContext(name) {
        this.context.process = name;
    }

    // private checkContext(name, flag) {
    //     if (!flag) {
    //         return false;
    //     }
    //     if (this.context.process !== name) {
    //         this.authorizationService.redirectToHome();
    //     }
    //     return true;
    // }

    private checkActivate() {
        if (this.accountInfo.activateCode) {
            this.pageService.setPageTitle(this.LANG.pageTitles.activateCode);
            this.setContext(undefined);
            this.activate.run();
        }
    }

}

