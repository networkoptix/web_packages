import { Component, Input, OnInit }  from '@angular/core';
import { ActivatedRoute, Router }    from '@angular/router';
import { SessionStorageService }     from 'ngx-webstorage';

import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxAccountService }          from '../../services/account.service';
import { NxPageService }             from '../../services/page.service';
import { NxProcessService, Process } from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { NxUriService }              from '../../services/uri.service';
import { NxUrlProtocolService }      from '../../services/url-protocol.service';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@Component({
    selector   : 'nx-activate-component',
    templateUrl: 'activate.component.html',
    styleUrls  : ['activate.component.scss']
})

export class NxActivateComponent implements OnInit {

    @Input() uriParam;
    @Input() uriParamCode;

    location;
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    accountInfo: any = {};
    activate: Process;
    reactivate: Process;
    activated;
    code;
    session;
    context;
    loading: boolean;
    reactivating;
    activationSuccess;

    private setupDefaults() {
        this.context = {
            process: ''
        };

        this.CONFIG = this.configService.getConfig();
        this.LANG = this.languageService.translations;
        this.pageService.pageTitle = this.LANG.pageTitles.activate?.();

        this.activate = this.processService.createProcess(() => {
            this.loading = true;
            return this.cloudApiService.activate(this.accountInfo.activateCode);
        }, {
            errorCodes: {
                notFound: () => {
                    this.sessionStorage.store('activationSuccess', '');
                    this.activationSuccess = false;
                    this.loading = false;
                    return false;
                },
                notAuthorized: () => {
                    this.sessionStorage.store('activationSuccess', '');
                    this.activationSuccess = false;
                    this.loading = false;
                    return false;
                },
                accountActivated: () => {
                    this.sessionStorage.store('activationSuccess', '');
                    this.activationSuccess = false;
                    this.loading = false;
                    return false;
                }
            },
            errorPrefix: this.LANG.errorCodes.cantActivatePrefix?.()
        }).then(() => {
            this.pageService.pageTitle = this.LANG.pageTitles.activateSuccess?.();
            this.sessionStorage.store('activationSuccess', true);
            this.activationSuccess = true;
            this.loading = false;
            this.dialogs.dismiss();

            this.uriService
                .updateURI('/activate/success', {}, true)
                .catch(error => {
                    console.error(error);
                });
        });

        this.reactivate = this.processService.createProcess(() => {
            return this.cloudApiService.reactivate(this.accountInfo.email);
        }, {
            errorCodes: {
                forbidden : this.LANG.errorCodes.accountAlreadyActivated?.(),
                notFound  : this.LANG.errorCodes.emailNotFound?.()
            },
            holdAlerts  : true,
            errorPrefix : this.LANG.errorCodes.cantSendConfirmationPrefix?.()
        }).then(() => {
            this.pageService.pageTitle = this.LANG.pageTitles.activateSuccess?.();
            this.dialogs.notify(this.LANG.account.activationLinkSent?.(), 'success');
        });
    }

    constructor(private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private urlProtocol: NxUrlProtocolService,
                private sessionStorage: SessionStorageService,
                private accountService: NxAccountService,
                private uriService: NxUriService,
                private dialogs: NxDialogsService,
                private route: ActivatedRoute,
                private router: Router,
                private languageService: NxLanguageProviderService,
                private configService: NxConfigService,
                private pageService: NxPageService
    ) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        // Process service trigger route reload (maybe AJS? ) ... revise this after we remove AJS
        this.uriParam = this.route.snapshot.data.uriParam;
        this.uriParamCode = this.route.snapshot.params.code;

        this.accountInfo = {
            newPassword  : '',
            email        : '', // moved to init()
            activateCode : this.uriParamCode
        };

        this.reactivating = (this.uriParam === 'reactivating');
        this.activationSuccess = (this.uriParam === 'activationSuccess');

        if (this.uriParam !== 'activating' && !this.sessionStorage.retrieve(this.uriParam)) {
            this.activationSuccess = false;
            this.accountService.redirectToHome();

            return;
        } else {
            this.sessionStorage.store('activationSuccess', '');
        }

        this.loading = true;

        if (this.reactivating) {
            this.accountService.redirectAuthorised();
        }

        this.accountInfo.email = this.accountService.email;

        if (this.accountInfo.activateCode) {
            this.accountService.logoutAuthorised();
            this.checkActivate();
        }
    }

    private checkActivate() {
        if (this.accountInfo.activateCode) {
            this.pageService.pageTitle = this.LANG.pageTitles.activateCode?.();
            this.activate.run();
        }
    }

    login() {
        this.dialogs.login(this.accountService, false, true);
    }
}
