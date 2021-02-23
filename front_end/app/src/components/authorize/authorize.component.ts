/* eslint-disable no-multi-spaces */
/* eslint-disable camelcase */
import {
    Component, OnDestroy, OnInit, ViewEncapsulation
}                                 from '@angular/core';
import {
    ActivatedRoute, Router, NavigationEnd
}                                 from '@angular/router';
import { UntilDestroy }           from '@ngneat/until-destroy';
import { BehaviorSubject }        from 'rxjs';
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
    code?: string,
    client_type?: string
};

export enum AuthorizeState {
    email = 'email',
    password = 'password',
    create = 'createAccount',
    activate = 'activateAccount',
    confirm = 'confirmation',
    request = 'resetPasswordRequest',
    reset = 'resetPassword',
    error = 'error'
};

export enum ClientType {
    loginCloud = 'loginToCloud',
    loginSystem = 'loginToSystem',
    loginWebadmin = 'loginToWebadmin',
    connect = 'connectSystemToCloud',
    setup = 'setupWizard',
    renewDesktop = 'renewSessionDesktop',
    renewWeb = 'renewSessionWeb'
};

// add a param for desktop/mobile/web
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
    AuthorizeState = AuthorizeState;

    content: any = {};
    footerItems: { name: string, url: string }[];

    // shared
    currentState: string;
    clientType: ClientType;
    windowWideEnough = true;
    initialData: AuthorizeParams;
    checkEmailProcess: Process;

    // email
    loginEmail: string;
    emailErrorCode: string;

    // password
    loginProcess: Process;
    loginPassword: string;
    passwordErrorCode: string;

    // create account
    existingEmail: string;
    createProcess: Process;
    accountInfo: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }

    createErrorCode: [inputType: string, errorCode: string];

    // activated
    activated$ = new BehaviorSubject<boolean>(false);
    fromEmail$ = new BehaviorSubject<boolean>(false);

    // password reset request
    confirmRequest: boolean;
    resetPasswordEmail: string;
    loginPostPasswordResetProcess: Process;
    resetRequestProcess: Process;
    resetRequestErrorCode: string;

    // reset password
    confirmReset: boolean;
    resetPassword: string;
    resetPasswordCode: string;
    loginPostNewPasswordProcess: Process;
    resetPasswordProcess: Process;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
        private cloudService: NxCloudApiService,
        private processService: NxProcessService
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

    setCurrentState(state: AuthorizeState) {
        this.currentState = state;
    }

    ngOnInit(): void {
        // should save email to local storage on login
        this.footerItems = this.CONFIG.dynamicMenus.authorizeFooter;
        this.initProcesses();
        this.route.queryParams.subscribe((params: any) => {
            this.initialData = NxUtilsService.deepCopy(params);
            this.clientType = ClientType[this.initialData.client_type || 'loginCloud'];
            this.currentState = AuthorizeState.email;

            // for reset password
            this.resetPasswordCode = this.route.snapshot.params.code;
            if (this.resetPasswordCode) {
                this.resetPasswordEmail = atob(this.resetPasswordCode).split(':')[1];
                this.currentState = AuthorizeState.reset;
            }
        });
    }

    initProcesses() {
        this.checkEmailProcess = this.processService.createProcess(
            async() => {
                const res = await this.cloudService.checkIfEmailExistsInCloud(this.loginEmail);
                if (this.currentState === AuthorizeState.activate && res.active) {
                    return this.login();
                }
                return Promise.resolve(res);
            },
            { ignoreError: true },
            ({ emailExists, active }) => {
                if (this.currentState === AuthorizeState.email) {
                    emailExists
                        ? this.currentState = AuthorizeState.password
                        : this.emailErrorCode = 'accountDoesNotExist';
                }
                if (this.currentState === AuthorizeState.activate && !active) {
                    this.activated$.next(false);
                }
            },
            err => console.error('err from checkEmailProcess', err)
        );

        this.loginProcess = this.processService.createProcess(
            this.login,
            { ignoreError: true },
            res => {
                window.location.href = res.link;
            },
            err => console.error('err from loginProcess', err)
        );

        // use factory if account properties are not needed outside of the create component
        // this.createProcessFactory = (props) => this.processService.createProcess(() => {
        this.createProcess = this.processService.createProcess(
            () => this.cloudService.registerUser(
                this.accountInfo.email,
                this.accountInfo.password,
                this.accountInfo.firstName,
                this.accountInfo.lastName,
                undefined) // code, not needed right now
            , { ignoreError: true },
            res => {
                if (res.resultCode === 'alreadyExists') {
                    this.createErrorCode = ['email', 'alreadyExists'];
                } else if (res.resultCode === 'portalError') {
                    // how to handle this? errorText: 'User is not in portal'
                } else {
                    // if we support code in the future, so that account can be activated upon registration
                    // then res.activated === true
                    this.currentState = AuthorizeState.activate;
                }
            },
            err => {
                if (err.resultCode === 'alreadyExists') {
                    this.createErrorCode = ['email', 'alreadyExists'];
                }
            }
        );

        this.resetRequestProcess = this.processService.createProcess(
            () => this.cloudService.restorePasswordRequest(this.resetPasswordEmail),
            { ignoreError: true },
            () => {
                this.confirmRequest = true;
            },
            err => {
                this.resetRequestErrorCode = 'accountDoesNotExist';
                console.error('err in reset request process', err);
            }
        );

        this.loginPostPasswordResetProcess = this.processService.createProcess(() => {
            this.loginEmail = this.resetPasswordEmail;
            this.currentState = AuthorizeState.password;
            return Promise.resolve();
        });

        this.resetPasswordProcess = this.processService.createProcess(
            () => this.cloudService.restorePassword(this.resetPasswordCode, this.resetPassword),
            { ignoreError: true },
            () => {
                this.confirmReset = true;
            },
            err => console.error(err)
        );

        this.loginPostNewPasswordProcess = this.processService.createProcess(() => {
            this.loginPassword = this.resetPassword;
            this.loginEmail = this.resetPasswordEmail; // || localStorage.email
            // get email from local storage
            this.currentState = AuthorizeState.password;
            return Promise.resolve();
        });
    }

    login = () => {
        return this.cloudService.authenticate(
            this.loginEmail,
            this.loginPassword,
            this.initialData.client_id || 'cloud_portal', // take out hard coded strings before pushing to production
            this.initialData.redirect_url || 'http://localhost:9000/',
            this.initialData.response_type || 'code',
            this.initialData.state
        );
    }

    ngOnDestroy() {}
}
