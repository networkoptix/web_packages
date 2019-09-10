import { Component, Inject, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router }    from '@angular/router';
import { Location }                  from '@angular/common';

import { NxUriService }              from '../../services/uri.service';
import { NxPageService }             from '../../services/page.service';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService }          from '../../services/process.service';
import { NxUrlProtocolService }      from '../../services/url-protocol.service';
import { LocalStorageService }       from 'ngx-store';
import { NxAccountService }          from '../../services/account.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';

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
        this.context = {
            process: ''
        };

        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.activate);

        this.activate = this.processService.createProcess(() => {
            this.loading = true;
            return this.cloudApiService.activate(this.accountInfo.activateCode);
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
            this.uriService.updateURI('/activate/success', {}, true);
        });

        this.reactivate = this.processService.createProcess(() => {
            return this.cloudApiService.reactivate(this.accountInfo.email);
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
    }

    constructor(private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private urlProtocol: NxUrlProtocolService,
                private localStorage: LocalStorageService,
                private accountService: NxAccountService,
                private uriService: NxUriService,
                private dialogs: NxDialogsService,
                private route: ActivatedRoute,
                private router: Router,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
                location: Location) {

        this.setupDefaults();
        this.location = location;
    }

    ngOnInit(): void {
        // Process service trigger route reload (maybe AJS? ) ... revise this after we remove AJS
        this.context.process = this.localStorage.get('activateProcess');

        this.uriParam = this.route.snapshot.data.uriParam;
        this.uriParamCode = this.route.snapshot.params.code;

        // Check session context
        if (this.checkContext('activateSuccess', this.uriParam) ||
                this.checkContext('restoringSuccess', this.uriParam) ||
                this.checkContext('changeSuccess', this.uriParam)) {

            this.setContext(undefined);
        }

        this.accountInfo = {
            newPassword : '',
            email       : '', // moved to init()
            activateCode: this.uriParamCode
        };

        this.reactivating = (this.uriParam === 'reactivating');
        this.activationSuccess = (this.uriParam === 'activationSuccess');
        this.changeSuccess = (this.uriParam === 'changeSuccess');

        this.loading = true;

        if (this.reactivating) {
            this.accountService.redirectAuthorised();
        }

        this.accountInfo.email = this.accountService.getEmail();

        if (this.accountInfo.activateCode) {
            this.accountService.logoutAuthorised();
            const code = this.accountInfo.activateCode;
            this.accountService
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
        this.localStorage.set('activateProcess', name);
    }

    private checkContext(name, flag) {
        if (!flag) {
            return false;
        }
        if (this.context.process !== name) {
            this.accountService.redirectToHome();
        }
        return true;
    }

    private checkActivate() {
        if (this.accountInfo.activateCode) {
            this.pageService.setPageTitle(this.LANG.pageTitles.activateCode);
            this.setContext(undefined);
            this.activate.run();
        }
    }

    login() {
        this.dialogs.login(this.accountService, false, true);
    }
}

