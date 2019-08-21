import { Component, OnInit }         from '@angular/core';
import { NxConfigService }           from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxAccountService }          from '../../services/account.service';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { ActivatedRoute }            from '@angular/router';
import { NxUriService }              from '../../services/uri.service';
import { NxPageService }             from '../../services/page.service';
import { LocalStorageService }       from 'ngx-store';
import { NxProcessService }          from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { NxSystemsService }          from '../../services/systems.service';

@Component({
    selector   : 'account',
    templateUrl: 'account.component.html',
    styleUrls  : ['account.component.scss']
})

export class NxAccountComponent implements OnInit {

    CONFIG: any;
    LANG: any;

    passwordMode: any;
    accountMode: any;

    account: any = {};
    pass: any = {};

    save: any;
    changePassword: any;

    private setupDefaults() {
        this.CONFIG = this.config.getConfig();
        this.LANG = this.language.getTranslations();

        this.pass = {
            password   : '',
            newPassword: ''
        };
    }

    constructor(private route: ActivatedRoute,
                private localStorage: LocalStorageService,
                private config: NxConfigService,
                private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private language: NxLanguageProviderService,
                private systemsService: NxSystemsService,
                private accountService: NxAccountService,
                private dialogs: NxDialogsService,
                private uriService: NxUriService,
                private pageService: NxPageService,
    ) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        const mode = this.route.snapshot.data.passwordMode;

        this.accountMode = !mode;
        this.passwordMode = mode;

        const title = (!mode) ? this.LANG.pageTitles.account : this.LANG.pageTitles.changePassword;
        this.pageService.setPageTitle(title);

        if (this.route.snapshot.data.auth) {
            let auth;
            try {
                auth = atob(this.route.snapshot.data.auth);
            } catch (exception) {
                auth = false;
                console.error(exception);
            }
            if (auth) {
                const index = auth.indexOf(':');
                const tempLogin = auth.substring(0, index);
                const tempPassword = auth.substring(index + 1);

                this.accountService
                    .login(tempLogin, tempPassword, false)
                    .then(() => {
                        this.accountService
                            .get()
                            .then((account) => {
                                this.account = account;
                            });

                    })
                    .finally(() => {
                        this.uriService.updateURI('', { auth: undefined });
                    });
            }
        } else {
            this.accountService
                .checkLoginState()
                .then(() => {
                    this.accountService
                        .get()
                        .then((account) => {
                            this.account = account;
                        });

                })
                .catch(() => {
                    this.dialogs.login(this.accountService, true);
                });
        }

        if (this.localStorage && this.localStorage.get('langChanged')) {
            this.localStorage.set('langChanged', false);
            this.dialogs.notify(this.LANG.account.accountSavedSuccess, 'success', false);
        }

        this.save = this.processService.createProcess(() => {
            return this.cloudApiService
                       .accountPost(this.account)
                       .then((result) => {
                           if (this.language.getLang() !== this.account.language) {
                               this.cloudApiService
                                   .changeLanguage(this.account.language)
                                   .then(() => {
                                       this.localStorage.set('langChanged', true);
                                       window.location.reload(); // reload window to catch new language
                                   });
                           } else {
                               this.systemsService.forceUpdateSystems();
                           }

                           return result;
                       });
        }, {
            successMessage : this.LANG.account.accountSavedSuccess,
            errorPrefix    : this.LANG.errorCodes.cantChangeAccountPrefix,
            logoutForbidden: true
        });

        this.changePassword = this.processService.createProcess(() => {
            return this.cloudApiService
                       .changePassword(this.pass.newPassword, this.pass.password);
        }, {
            errorCodes        : {
                notAuthorized   : this.LANG.errorCodes.oldPasswordMistmatch,
                wrongOldPassword: this.LANG.errorCodes.oldPasswordMistmatch
            },
            successMessage    : this.LANG.account.passwordChangedSuccess,
            errorPrefix       : this.LANG.errorCodes.cantChangePasswordPrefix,
            ignoreUnauthorized: true
        });
    }

    changeLanguage(langCode) {
        this.account.language = langCode;
    }
}

