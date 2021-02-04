/* eslint-disable no-multi-spaces */
/* eslint-disable camelcase */
import {
    Component, Input,
    OnDestroy, OnInit, ViewEncapsulation
}                                 from '@angular/core';
import {
    ActivatedRoute, Router, NavigationEnd
}                                 from '@angular/router';
import { UntilDestroy }           from '@ngneat/until-destroy';
import { Subscription }           from 'rxjs';
import { filter, tap }            from 'rxjs/operators';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxDialogsService }          from '@dialogs/dialogs.service';
import {
    NxSystem, NxSystemService
}                                    from '@services/system.service';
import { NxSystemsService }          from '@services/systems.service';
import { Account, NxAccountService } from '@services/account.service';
import { NxUtilsService }            from '@services/utils.service';
import { NxUriService }              from '@services/uri.service';
import { NxScrollMechanicsService }  from '@services/scroll-mechanics.service';
import { NxApplyService }            from '@services/apply.service';
import { NxPageService }             from '@services/page.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxAppStateService }         from '@services/nx-app-state.service';
import { NxCloudApiService }         from '@services/nx-cloud-api';

interface AuthorizeParams {
    response_type: string,
    client_id: string,
    redirect_url: string,
    grant_type?: string,
    scope?: string,
    state?: string,
    client_type?: string
};

export enum AuthorizeState {
    email = 'email',
    password = 'password',
    create = 'createAccount',
    activate = 'activateAccount',
    confirm = 'confirmation',
    error = 'error'
};

export enum ClientType {
    loginCloud = 'loginToCloud',
    loginSystem = 'loginToSystem',
    loginWebadmin = 'loginToWebadmin',
    connect = 'connectSystemToCloud',
    setup = 'setupWizard',
    expired = 'sessionExpired',
    renewDesktop = 'renewSessionDesktop',
    renewWeb = 'renewSessionWeb'
};

@UntilDestroy({ checkProperties: true })
@Component({
    selector      : 'nx-authorize-component',
    templateUrl   : 'authorize.component.html',
    styleUrls     : ['authorize.component.scss'],
    encapsulation : ViewEncapsulation.None
})
export class NxAuthorizeComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    plugin;
    content: any = {};
    AuthorizeState = AuthorizeState;

    footerItems: { name: string, url: string }[];

    currentState: AuthorizeState;
    clientType: ClientType;
    windowWideEnough = true;
    initialData: AuthorizeParams;

    emailProcess: Process;
    authorizeEmail: string;
    emailErrorCode: string;

    passwordProcess: Process;
    authorizePassword: string;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
        private cloudService: NxCloudApiService,
        private processService: NxProcessService
        // private accountService: NxAccountService,
        // private pageService: NxPageService,
        // private dialogs: NxDialogsService,
        // private systemService: NxSystemService,
        // private systemsService: NxSystemsService,
        // private uriService: NxUriService,
        // private router: Router,
        // private scrollMechanicsService: NxScrollMechanicsService,
        // private applyService: NxApplyService,
        // private appStateService: NxAppStateService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.footerItems = this.CONFIG.dynamicMenus.authorizeFooter;
        this.initProcesses();
        this.route.queryParams.subscribe((params: any) => {
            this.initialData = NxUtilsService.deepCopy(params);
            this.clientType = ClientType[this.initialData.client_type || 'loginCloud'];
            this.currentState = AuthorizeState.email;
            this.setupComponents();
        });
    }

    initProcesses() {
        this.emailProcess = this.processService.createProcess(async() => {
            const { emailExists } = await this.cloudService.checkIfEmailExistsInCloud(this.authorizeEmail);
            if (emailExists) {
                this.currentState = AuthorizeState.password;
            } else {
                this.emailErrorCode = 'accountDoesNotExist';
            }
            return Promise.resolve();
        }, { ignoreError: true });

        this.passwordProcess = this.processService.createProcess(async() => {
            let result;
            try {
                result = await this.cloudService.authenticate(
                    this.authorizeEmail,
                    this.authorizePassword,
                    this.initialData.client_id || 'cloud_portal', // take out hard coded strings before pushing to production
                    this.initialData.redirect_url || 'http://localhost:9000/',
                    this.initialData.response_type || 'code',
                    this.initialData.state
                );
                window.location.href = result.link;
            } catch (err) {
                console.error('err from oauth/authenticate', err);
            }
            return Promise.resolve();
        }, { ignoreError: true });
    }

    getEmailFromChild(email: string) {
        this.authorizeEmail = email;
    }

    getPasswordFromChild(password: string) {
        this.authorizePassword = password;
    }

    ngOnDestroy() {}

    setupComponents() {
        this.content = {
            loginToCloud: {
                email: {
                    headerIllustration : 'cloud',
                    header             : this.LANG.authorize.loginCloudHeader,
                    subHeader          : undefined,
                    additionalText     : undefined,
                    textButton         : this.LANG.authorize.createText,
                    backButton         : false
                },
                password: {
                    headerIllustration : 'cloud',
                    header             : this.LANG.authorize.loginCloudHeader,
                    subHeader          : this.LANG.authorize.asAccountSubheader,
                    forgotButton       : true,
                    logOutButton       : false,
                    backButton         : true
                },
                error: {
                    placeholder    : 'error',
                    content        : this.LANG.authorize.loginError,
                    additionalText : this.LANG.authorize.loginErrorAdditional,
                    backButton     : false
                }
            },
            loginToSystem: {
                email: {
                    headerIllustration : 'cloud',
                    header             : this.LANG.authorize.loginSystemHeader,
                    subHeader          : this.LANG.authorize.loginSystemSubheader,
                    additionalText     : undefined,
                    textButton         : undefined,
                    backButton         : false
                },
                password: {
                    headerIllustration : 'cloud',
                    header             : this.LANG.authorize.loginSystemHeader,
                    subHeader          : this.LANG.authorize.asAccountSubheader,
                    forgotButton       : true,
                    logOutButton       : false,
                    backButton         : true
                },
                error: {
                    placeholder    : 'error',
                    content        : this.LANG.authorize.loginError,
                    additionalText : this.LANG.authorize.loginErrorAdditional,
                    backButton     : false
                }
            },
            loginToWebadmin: {
                email: {
                    headerIllustration : 'server',
                    header             : this.LANG.authorize.loginSystemHeader,
                    subHeader          : undefined,
                    additionalText     : undefined,
                    textButton         : undefined,
                    backButton         : false
                },
                password: {
                    headerIllustration : 'server',
                    header             : this.LANG.authorize.loginSystemHeader,
                    subHeader          : this.LANG.authorize.asAccountSubheader,
                    forgotButton       : false,
                    logOutButton       : false,
                    backButton         : true
                },
                error: {
                    placeholder    : 'error',
                    content        : this.LANG.authorize.loginError,
                    additionalText : this.LANG.authorize.loginErrorAdditional,
                    backButton     : false
                }
            },
            connectSystem: {
                email: {
                    headerIllustration : 'cloud',
                    header             : this.LANG.authorize.loginCloudHeader,
                    subHeader          : undefined,
                    additionalText     : undefined,
                    textButton         : this.LANG.authorize.createText,
                    backButton         : false
                },
                password: {
                    headerIllustration : 'cloud',
                    header             : this.LANG.authorize.loginCloudHeader,
                    subHeader          : this.LANG.authorize.asAccountSubheader,
                    forgotButton       : true,
                    logOutButton       : false,
                    backButton         : true
                },
                error: {
                    placeholder    : 'error',
                    content        : this.LANG.authorize.loginError,
                    additionalText : this.LANG.authorize.loginErrorAdditional,
                    backButton     : false
                }
            }
        };
    }
    /**
     * Chris' suggestion
     * class AuthContent {
            ... property definitions
            constructor(
                content: Partial<AuthContent>
            ) {...combine content with contentDefault object}
        }

        class AuthStateContent {
            constructor(
                public email: AuthContent,
                public password: AuthContent,
                public error: ErrorContent = defaultErrorState
            ){}
        }

        interface AuthStates {
            [key: ClientType] : AuthStateContent
        }
        this.content = {
            [ClientType.loginCloud]: new AuthStateContent(
                new AuthContent({...}),
                new AuthContent({...}),
                // Error can be left empty to use default
            )
        }
     */
}
