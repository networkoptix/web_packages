/* eslint-disable no-multi-spaces */
/* eslint-disable camelcase */
import {
    Component, ElementRef, HostListener, Inject,
    OnDestroy, OnInit, ViewEncapsulation
}                                     from '@angular/core';
import { ActivatedRoute, Router }     from '@angular/router';
import { UntilDestroy }               from '@ngneat/until-destroy';
import { BehaviorSubject, defer, fromEvent } from 'rxjs';
import { debounceTime, retryWhen, delay, take, map }   from 'rxjs/operators';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxUtilsService }            from '@services/utils.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxCloudApiService }         from '@services/nx-cloud-api';
import { WINDOW }                    from '@services/window-provider';
import { Account, NxAccountService } from '@services/account.service';
import { NxUriService }              from '@services/uri.service';
import { NxScrollMechanicsService }  from '@services/scroll-mechanics.service';
import { NxPageService }             from '@services/page.service';

interface AuthorizeParams {
    response_type: string,
    client_id: string,
    redirect_url: string,
    grant_type?: string,
    scope?: string,
    state?: string,
    code?: string,
    client_type?: ClientType,
    view_type?: 'desktop' | 'mobile' | 'web',
    message?: 'passwordReset' | 'activated'
};

export type AuthorizeStateType = 'email' | 'password' | 'create' | 'activate' | 'confirm' | 'request' | 'reset' | 'error'
export enum AuthorizeState {
    email = 'email',
    password = 'password',
    create = 'createAccount',
    activate = 'activateAccount',
    confirm = 'confirmation',
    request = 'resetPasswordRequest',
    reset = 'resetPassword',
    error = 'error',
    auth = 'authCode',
    backup = 'backupCode',
    newBackup = 'newBackupCode'
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
    viewType: 'desktop' | 'mobile' | 'web';
    windowLargeEnough = false;
    windowSmallEnough = false;
    initialData: AuthorizeParams;
    checkEmailProcess: Process;
    codeFromRoute: string;

    // email
    loginEmail: string;
    emailErrorCode: string;

    // password
    loginProcess: Process;
    loginPassword: string;
    passwordErrorCode: string;
    // shouldStayLoggedIn: boolean;

    // create account
    createProcess: Process;
    accountInfo: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    };

    createErrorCode: [inputType: string, errorCode: string];

    // activated
    loginPostExternalProcess: Process;
    activated$ = new BehaviorSubject<boolean>(false);
    fromEmail$ = new BehaviorSubject<boolean>(false);

    // password reset request
    confirmRequest: boolean;
    resetPasswordEmail: string;
    resetRequestProcess: Process;
    resetRequestErrorCode: string;

    // reset password
    confirmReset: boolean;
    resetPassword: string;
    resetPasswordProcess: Process;

    // connection error
    errorDialog$ = new BehaviorSubject<boolean>(false);
    errorDialogProcess: Process;

    // authentication code
    authCode: string;
    checkAuthCodeProcess: Process;
    authCodeErrorCode: string;

    // backup code
    backupCode: string;
    checkBackupCodeProcess: Process;
    backupCodeErrorCode: string;

    // new backup code
    newBackupCode: string;

    @HostListener('document:keypress', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (event.code === 'Enter') {
            this.elem.nativeElement.querySelector('button.process-button').click();
        }
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
        private cloudService: NxCloudApiService,
        private processService: NxProcessService,
        private accountService: NxAccountService,
        private router: Router,
        private elem: ElementRef,
        @Inject(WINDOW) public window: Window
        // private pageService: NxPageService,
        // private uriService: NxUriService,
        // private scrollMechanicsService: NxScrollMechanicsService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }

    setCurrentState(state: string) {
        this.currentState = AuthorizeState[state];
    }

    ngOnInit(): void {
        // should save email to local storage on login?
        this.footerItems = this.CONFIG.dynamicMenus.authorizeFooter.nodes;
        this.initProcesses();

        const { action } = this.route.snapshot?.data;
        if (action) {
            this.codeFromRoute = this.route.snapshot.params.code;
            this.loginEmail = atob(this.codeFromRoute).split(':')[1];
        }
        this.route.queryParams.subscribe(async(params: any) => {
            this.initialData = NxUtilsService.deepCopy(params);
            this.clientType = ClientType[this.initialData.client_type || 'loginCloud'];
            this.viewType = this.initialData.view_type || 'web';

            this.windowLargeEnough = this.window.innerWidth > 560 && this.window.innerHeight > 720 && this.viewType === 'web';
            this.windowSmallEnough = this.window.innerWidth <= 355;
            fromEvent(this.window, 'resize').pipe(debounceTime(100)).subscribe((event: any) => {
                const { innerHeight, innerWidth } = event.target;
                this.windowLargeEnough = innerWidth > 560 && innerHeight > 720 && this.viewType === 'web';
                this.windowSmallEnough = innerWidth <= 355;
            });

            if (this.clientType === ClientType.loginCloud) {
                this.initialData.client_id = 'cloud';
                this.initialData.redirect_url = '';
                this.initialData.response_type = 'code';
            }

            if (action === 'reset_password') {
                this.currentState = AuthorizeState.reset;
            } else if (action === 'activate') {
                await this.cloudService.activate(this.codeFromRoute).catch(err => console.error(err));
                this.fromEmail$.next(true);
                this.activated$.next(true);
                this.currentState = AuthorizeState.activate;
            } else {
                this.currentState = AuthorizeState.email;
            }
        });
    }

    handleCloudConnectionError(err: any, process: Process) {
        if ([500, 503].includes(err?.status) || err.message.includes('timeout')) {
            this.errorDialogProcess = process;
            this.errorDialog$.next(true);
        }
    }

    handleLoginSuccess = async (res) => {
        this.errorDialog$.value && this.errorDialog$.next(false);
        if (['connectSystemToCloud', 'setupWizard'].includes(this.clientType)) {
            this.initialData.redirect_url = res.link;
            this.currentState = AuthorizeState.confirm;
        } else if (res?.link.startsWith('?code=')) {
            await this.cloudService.loginCode(res.link.slice(6));
            defer(() => this.accountService.get())
                .pipe(
                    map(res => {
                        if (!res) {
                            throw Error('undefined response from accountService get');
                        }
                        return res;
                    }),
                    retryWhen(errors => errors.pipe(delay(500), take(10)))
                )
                .subscribe(() => {
                    this.router.navigate([this.CONFIG.redirect.authorised]);
                });
        } else {
            this.redirect(res.link);
        }
    }

    initProcesses() {
        const timeoutMs = 3000;
        this.checkEmailProcess = this.processService.createProcess(
            async() => {
                this.emailErrorCode = '';
                const res = await this.cloudService.checkIfEmailExistsInCloud(this.loginEmail);
                if (this.currentState === AuthorizeState.activate && res.active) {
                    return this.login();
                }
                return Promise.resolve(res);
            },
            { ignoreError: true, timeoutMs },
            ({ emailExists, active }) => {
                this.errorDialog$.value && this.errorDialog$.next(false);
                if (this.currentState === AuthorizeState.email) {
                    if (!emailExists) {
                        this.emailErrorCode = 'accountDoesNotExist';
                    } else if (!active) {
                        this.emailErrorCode = 'accountNotActivated';
                    } else {
                        this.currentState = AuthorizeState.password;
                    }
                }
                if (this.currentState === AuthorizeState.activate) {
                    if (active) {
                        this.redirect();
                    } else {
                        this.activated$.next(false);
                    }
                }
            },
            err => {
                console.error('err from checkEmailProcess', err);
                this.handleCloudConnectionError(err, this.checkEmailProcess);
            }
        );

        this.loginProcess = this.processService.createProcess(
            () => {
                this.passwordErrorCode = '';
                return this.login();
            },
            {
                ignoreUnauthorized : true,
                ignoreError        : true,
                timeoutMs
            },
            res => {
                // not final code
                if (res['2faRequired']) {
                    this.currentState = AuthorizeState.auth;
                } else {
                    this.handleLoginSuccess(res);
                }
            },
            err => {
                console.error('err from loginProcess', err);
                if (err?.resultCode) {
                    if (err.resultCode === 'notAuthorized') {
                        this.passwordErrorCode = 'wrongPassword';
                    } else if (err.resultCode === 'accountBlocked') {
                        this.passwordErrorCode = 'lockedOut';
                    }
                } else {
                    this.handleCloudConnectionError(err, this.loginProcess);
                }
            }
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
            , { ignoreError: true, timeoutMs },
            res => {
                this.errorDialog$.value && this.errorDialog$.next(false);
                if (res.resultCode === 'alreadyExists') {
                    this.createErrorCode = ['email', 'alreadyExists'];
                } else if (res.resultCode === 'portalError') {
                    // how to handle this? errorText: 'User is not in portal'
                } else {
                    // if we support code in the future, so that account can be activated upon registration
                    // then res.activated === true
                    this.loginEmail = this.accountInfo.email;
                    this.currentState = AuthorizeState.activate;
                }
            },
            err => {
                if (err.resultCode === 'alreadyExists') {
                    this.createErrorCode = ['email', 'alreadyExists'];
                } else {
                    this.handleCloudConnectionError(err, this.createProcess);
                }
            }
        );

        this.resetRequestProcess = this.processService.createProcess(
            () => this.cloudService.restorePasswordRequest(this.resetPasswordEmail),
            { ignoreError: true, timeoutMs },
            () => {
                this.errorDialog$.value && this.errorDialog$.next(false);
                this.loginEmail = this.resetPasswordEmail;
                this.confirmRequest = true;
            },
            err => {
                console.error('err in reset request process', err);
                this.handleCloudConnectionError(err, this.resetRequestProcess);
            }
        );

        this.resetPasswordProcess = this.processService.createProcess(
            () => this.cloudService.restorePassword(this.codeFromRoute, this.resetPassword),
            { ignoreError: true, timeoutMs },
            () => {
                this.errorDialog$.value && this.errorDialog$.next(false);
                this.confirmReset = true;
            },
            err => {
                console.error('err in resetPassword process', err);
                this.handleCloudConnectionError(err, this.resetPasswordProcess);
            }
        );

        this.loginPostExternalProcess = this.processService.createProcess(() => {
            this.currentState = AuthorizeState.password;
            return Promise.resolve();
        });

        this.checkAuthCodeProcess = this.processService.createProcess(
            () => {
                return Promise.resolve();
            },
            { ignoreError: true, timeoutMs },
            () => {
                this.currentState = AuthorizeState.backup;
            }
        );

        this.checkBackupCodeProcess = this.processService.createProcess(
            () => {
                return Promise.resolve();
            },
            { ignoreError: true, timeoutMs },
            () => {
                this.newBackupCode = '2f4q sip7 rdcr';
                this.currentState = AuthorizeState.newBackup;
            }
        );
    }

    login = () => {
        // should pass in some data to denote whether user should stay logged in or not? (this.shouldStayLoggedIn) likely to be removed
        return this.cloudService.authenticate(
            this.loginEmail,
            this.loginPassword,
            this.initialData.client_id, // use for testing || 'cloud',
            this.initialData.redirect_url, // || 'http://localhost:9000/',
            this.initialData.response_type, // || 'code',
            this.initialData.state
        );
    }

    checkIfActivated = async() => {
        const { active } = await this.cloudService.checkIfEmailExistsInCloud(this.loginEmail);
        if (active) {
            this.activated$.next(true);
        }
    }

    reactivate = () => {
        return this.cloudService.reactivate(this.loginEmail);
    }

    redirect = (route?: string) => {
        if (route || this.initialData?.redirect_url) {
            this.window.location.href = route || this.initialData.redirect_url;
        } else {
            this.router.navigate(['systems']);
        }
    }

    // stayingLoggedIn(stayLoggedIn: boolean) {
    //     this.shouldStayLoggedIn = stayLoggedIn;
    // }

    ngOnDestroy() {}
}
