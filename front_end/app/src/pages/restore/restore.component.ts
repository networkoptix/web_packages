import { Component, Input, OnInit }  from '@angular/core';
import { ActivatedRoute, Router }    from '@angular/router';
import { LocalStorageService }       from 'ngx-store';

import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxAccountService }          from '../../services/account.service';
import { NxPageService }             from '../../services/page.service';
import { NxProcessService, Process } from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { NxUriService }              from '../../services/uri.service';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@Component({
    selector : 'nx-restore-component',
    templateUrl : 'restore.component.html',
    styleUrls : ['restore.component.scss']
})

export class NxRestoreComponent implements OnInit {
    @Input() uriParam;
    @Input() uriParamCode;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    change: Process;
    restore: Process;
    data;
    restoring;
    restoringSuccess;
    changeSuccess;
    context;
    ready: boolean;
    hideErrors = true;

    private setupDefaults(configService) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;
        this.pageService.pageTitle = this.LANG.pageTitles.restorePassword;

        this.context = {
            process: ''
        };
    }

    constructor(configService: NxConfigService,
                private cloudApiService: NxCloudApiService,
                private accountService: NxAccountService,
                private processService: NxProcessService,
                private localStorage: LocalStorageService,
                private uriService: NxUriService,
                private dialogs: NxDialogsService,
                private route: ActivatedRoute,
                private router: Router,
                private language: NxLanguageProviderService,
                private pageService: NxPageService
    ) {
        this.setupDefaults(configService);
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
                        this.router
                            .navigate(['/register/' + code])
                            .catch(error => {
                                console.error(error);
                            });
                    } else {
                        this.router
                            .navigate(['/restore_password/' + code])
                            .catch(error => {
                                console.error(error);
                            });
                    }
                }, () => {
                    // Wrong activation code or some error - send to activation page
                    this.router
                        .navigate(['/activate/' + code])
                        .catch(error => {
                            console.error(error);
                        });
                });
        }

        this.change = this.processService.createProcess(() => {
            return this.cloudApiService.restorePassword(this.data.restoreCode, this.data.newPassword);
        }, {
            errorCodes: {
                notFound      : this.LANG.errorCodes.wrongCodeRestore,
                notAuthorized : this.LANG.errorCodes.wrongCodeRestore
            },
            ignoreUnauthorized : true,
            holdAlerts         : true,
            errorPrefix        : this.LANG.errorCodes.cantChangePasswordPrefix
        }).then(() => {
            this.pageService.pageTitle = this.LANG.pageTitles.restorePasswordSuccess;
            this.setContext('changeSuccess');
            this.dialogs.dismiss();
            this.uriService
                .updateURI('/restore_password/success', {})
                .catch(error => {
                    console.error(error);
                });
        });

        this.restore = this.processService.createProcess(() => {
            return this.cloudApiService.restorePasswordRequest(this.data.email);
        }, {
            errorCodes: {
                notFound: this.LANG.errorCodes.emailNotFound
            },
            ignoreUnauthorized : true,
            holdAlerts         : true,
            errorPrefix        : this.LANG.errorCodes.cantSendActivationPrefix
        }).then(() => {
            this.pageService.pageTitle = this.LANG.pageTitles.restorePasswordSuccess;
            this.restoring = false;
            this.restoringSuccess = true;
            this.setContext('restoringSuccess');
            this.setEmail(this.data.email);
            this.dialogs.dismiss();

            this.uriService
                .updateURI('/restore_password/sent', {})
                .catch(error => {
                    console.error(error);
                });
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
        if (!arr.includes(this.context.process) && this.uriParam) {
            this.accountService.redirectToHome();
            return;
        }
        return this.uriParam;
    }

    login() {
        this.dialogs.login(false, true);
    }

    loginRedirect() {
        const { url } = this.router;
        const redirect = this.CONFIG.redirect.paths.some((path) => {
            return path === '/' ? url === '/' : url.includes(path);
        });
        // Handling promise to satisfy the linter.
        this.dialogs.login(!redirect).then(() => {});
    }
}
