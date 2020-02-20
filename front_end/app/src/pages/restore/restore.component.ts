import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router }   from '@angular/router';

import { NxUriService }              from '../../services/uri.service';
import { NxPageService }             from '../../services/page.service';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService }          from '../../services/process.service';
import { LocalStorageService }       from 'ngx-store';
import { NxConfigService }           from '../../services/nx-config';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { NxAccountService }          from '../../services/account.service';

@Component({
    selector   : 'nx-restore-component',
    templateUrl: 'restore.component.html',
    styleUrls  : ['restore.component.scss']
})

export class NxRestoreComponent implements OnInit {

    @Input() uriParam;
    @Input() uriParamCode;

    LANG: any = {};
    CONFIG: any = {};

    change: any;
    restore: any;
    data: any;
    restoring: any;
    restoringSuccess: any;
    changeSuccess: any;
    context: any;
    ready: boolean;

    private setupDefaults() {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.restorePassword);

        this.context = {
            process: ''
        };
    }

    constructor(private configService: NxConfigService,
                private cloudApiService: NxCloudApiService,
                private accountService: NxAccountService,
                private processService: NxProcessService,
                private localStorage: LocalStorageService,
                private uriService: NxUriService,
                private dialogs: NxDialogsService,
                private route: ActivatedRoute,
                private router: Router,
                private language: NxLanguageProviderService,
                private pageService: NxPageService,
    ) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.ready = false;
        // ... revise this after we remove AJS ... cannot use location.path() as it will trigger AJS
        // updateURI causes component to be re-created
        this.context.process = this.localStorage.get('restoreProcess');

        this.uriParam = this.route.snapshot.data.uriParam;
        this.uriParamCode = this.route.snapshot.params.code;

        // Check session context
        if (this.uriParam !== 'restoring' &&
            this.checkContexts(['changeSuccess', 'restoringSuccess'])) {

            this.setContext(undefined);
        }

        this.data = {
            newPassword : '',
            email       : this.localStorage.get('email') || '',
            restoreCode : this.uriParamCode
        };

        this.localStorage.remove('email');

        this.restoring = (this.uriParam === 'restoring');
        this.restoringSuccess = (this.uriParam === 'restoringSuccess');
        this.changeSuccess = (this.uriParam === 'changeSuccess');

        if (this.data.restoreCode) {
            this.accountService.logoutAuthorised();
            const code = this.data.restoreCode;
            this.accountService
                .checkCode(code)
                .then(registered => {
                    if (!registered) {
                        // send to registration form with the code
                        this.router.navigate(['/register/' + code]);
                    } else {
                        this.router.navigate(['/restore_password/' + code]);
                    }
                }, () => {
                    // Wrong activation code or some error - send to activation page
                    this.router.navigate(['/activate/' + code]);
                });
        }


        this.change = this.processService.createProcess(() => {
            return this.cloudApiService.restorePassword(this.data.restoreCode, this.data.newPassword);
        }, {
            errorCodes        : {
                notFound     : this.LANG.errorCodes.wrongCodeRestore,
                notAuthorized: this.LANG.errorCodes.wrongCodeRestore
            },
            ignoreUnauthorized: true,
            holdAlerts        : true,
            errorPrefix       : this.LANG.errorCodes.cantChangePasswordPrefix
        }).then(() => {
            this.pageService.setPageTitle(this.LANG.pageTitles.restorePasswordSuccess);
            this.setContext('changeSuccess');
            this.dialogs.dismiss();
            this.uriService.updateURI('/restore_password/success', {});
        });

        this.restore = this.processService.createProcess(() => {
            return this.cloudApiService.restorePasswordRequest(this.data.email);
        }, {
            errorCodes        : {
                notFound: this.LANG.errorCodes.emailNotFound
            },
            ignoreUnauthorized: true,
            holdAlerts        : true,
            errorPrefix       : this.LANG.errorCodes.cantSendActivationPrefix
        }).then(() => {
            this.pageService.setPageTitle(this.LANG.pageTitles.restoringSuccess);
            this.restoring = false;
            this.restoringSuccess = true;
            this.setContext('restoringSuccess');
            this.setEmail(this.data.email);
            this.dialogs.dismiss();
            this.uriService.updateURI('/restore_password/sent', {});
        });

        // give checkContext time to redirect if context is not correct
        setTimeout(() => {
            this.ready = true;
        }, 500);
    }

    setContext(name) {
        this.context.process = name;
        this.localStorage.set('restoreProcess', name);
    }

    setEmail(email) {
        this.localStorage.set('email', email);
    }

    private checkContexts(arr) {
        if (!this.uriParam) {
            return false;
        }
        if (!arr.includes(this.context.process)) {
            // this.accountService.redirectToHome();
        }
        return true;
    }

    login() {
        this.dialogs.login(this.accountService, false, true);
    }

    loginRedirect () {
        const url = this.router.url;
        const redirect = this.CONFIG.redirectPaths.some((path) => url.indexOf(path) > -1);
        // Handling promise to satisfy the linter.
        this.dialogs.login(this.accountService, !redirect).then(() => {});
    }
}

