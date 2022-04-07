/* eslint-disable no-multi-spaces */
/* eslint-disable camelcase */
import { HttpClient } from '@angular/common/http';
import {
    Component,
    ElementRef,
    HostListener,
    Inject,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, fromEvent, of } from 'rxjs';
import { catchError, debounceTime, map } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxUtilsService } from '@services/utils.service';
import { WINDOW } from '@services/window-provider';

require('what-input');

export interface AuthorizeParams {
    response_type: string,
    client_id: string,
    redirect_url: string,
    client_type?: ClientType,
    view_type?: 'desktop' | 'mobile' | 'web',
    grant_type?: string,
    scope?: string,
    signature?: string,
    state?: string,
    code?: string,
    message?: 'passwordReset' | 'activated',
    email?: string,
    access_code?: string,
    access_token?: string
}

export type AuthorizeStateType = 'email' |
    'password' |
    'create' |
    'activate' |
    'confirm' |
    'request' |
    'reset' |
    'error' |
    'auth' |
    'backup' |
    'notSecure'

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
    notSecure = 'notSecure'
}

export enum ClientType {
    loginCloud = 'loginToCloud',
    loginWebadmin = 'loginToWebadmin',
    passwordDisconnect = 'confirmPasswordDisconnect',
    passwordMerge = 'confirmPasswordMerge',
    passwordBackup = 'confirmPasswordCreateBackup',
    passwordRestore = 'confirmPasswordRestoreBackup',
    passwordReset = 'confirmPasswordResetServer',
    passwordRestart = 'confirmPasswordRestartServer',
    passwordDetach = 'confirmPasswordDetachServer',
    create = 'createAccount',
    connect = 'connectSystemToCloud',
    setup = 'setupWizard',
    renewDesktop = 'renewSessionDesktop',
    renewWeb = 'renewSessionWeb',
    openClient = 'openClientFromCloud',
    system2faAuth = 'system2faAuth',
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-component',
    templateUrl: 'authorize.component.html',
    styleUrls: ['authorize.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxAuthorizeComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    AuthorizeState = AuthorizeState;

    content: any = {};
    footerItems: { name: string, url: string }[];

    // shared
    currentState: AuthorizeState;
    clientType: ClientType;
    viewType: 'desktop' | 'mobile' | 'web';
    windowLargeEnough = false;
    windowSmallEnough = false;
    initialData: AuthorizeParams;
    checkEmailProcess: Process;
    loginCode: string;
    emailLocked = false;
    action: 'restore_password'| 'activate' | 'register' | 'reset_request';

    // email
    loginEmail: string;
    emailErrorCode: string;

    // password
    loginProcess: Process;
    loginPassword: string;
    passwordErrorCode: string;
    redirectLink: string;

    // create account
    createProcess: Process;
    fromInvite = false;
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
    errorType: string;

    // authentication code
    authCode: string;
    checkAuthCodeProcess: Process;
    authCodeErrorCode: string;

    // backup code
    backupCode: string;
    checkBackupCodeProcess: Process;
    backupCodeErrorCode: string;

    @HostListener('document:keypress', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (['Enter', 'NumpadEnter'].includes(event.code)) {
            this.elem.nativeElement.querySelector('button.on-keypress-enter').click();
        }
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private httpClient: HttpClient,
        private route: ActivatedRoute,
        private cloudService: NxCloudApiService,
        private processService: NxProcessService,
        private router: Router,
        private elem: ElementRef,
        private localStorageService: LocalStorageService,
        private toastService: NxToastService,
        @Inject(WINDOW) public window: Window
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }

    private verifyRedirectUrl(systemId) {
        const systemUrl = this.CONFIG.trafficRelayHost.replace('{systemId}', systemId);
        return this.httpClient.get(`https://${systemUrl}/rest/v1/servers/*/info`)
            .pipe(
                untilDestroyed(this),
                catchError(() => of(false)),
                map((servers: any) => {
                    return servers && servers.some(({ remoteAddresses }) => remoteAddresses
                        .some((address) => this.initialData.redirect_url.includes(address))
                    );
                }));
    }

    // method only used by child components to transition between child components
    setCurrentState(state: string) {
        // when user uses link to go directly to create-account and presses back, sets them into normal login clientTypes
        if (state === 'email' && this.clientType === ClientType.create) {
            this.clientType = environment.isLocal ? ClientType.loginWebadmin : ClientType.loginCloud;
        }
        this.currentState = AuthorizeState[state];
    }

    ngOnInit(): void {
        // should save email to local storage on login?
        this.footerItems = this.CONFIG.dynamicMenus.authorizeFooter.nodes;
        this.initProcesses();

        this.action = this.route.snapshot?.data?.action;
        if (this.action) {
            this.loginCode = this.route.snapshot.params.code;
            if (this.loginCode) {
                this.loginEmail = atob(this.loginCode).split(':')[1];
                this.fromInvite = this.action === 'register';
            }
        }
        this.route.queryParams.subscribe(async(params: any) => {
            this.initialData = NxUtilsService.deepCopy(params);
            this.initialData.email &&= this.initialData.email.replace(' ', '+');
            const clientType = this.initialData.client_type || this.localStorageService.retrieve('client_type') || 'loginCloud';
            this.clientType = ClientType[clientType];
            this.viewType = this.initialData.view_type || 'web';

            this.windowLargeEnough = this.window.innerWidth > 560 && this.window.innerHeight > 720 && this.viewType === 'web';
            this.windowSmallEnough = this.window.innerWidth <= 355;
            fromEvent(this.window, 'resize').pipe(debounceTime(100)).subscribe((event: any) => {
                const { innerHeight, innerWidth } = event.target;
                this.windowLargeEnough = innerWidth > 560 && innerHeight > 720 && this.viewType === 'web';
                this.windowSmallEnough = innerWidth <= 355;
            });

            if ([ClientType.loginCloud, ClientType.create].includes(this.clientType)) {
                this.initialData.client_id = 'cloud';
                this.initialData.redirect_url ||= '';
                this.initialData.response_type = 'code';
            }

            const { access_token, access_code, code, email, redirect_url } = this.initialData;
            const skipTo2FaClientTypes = [
                'renewSessionDesktop',
                'renewSessionWeb',
                'openClientFromCloud',
                'system2faAuth'
            ];
            if (skipTo2FaClientTypes.includes(this.clientType) && (access_token || access_code || code)) {
                this.loginEmail = email;
                this.loginCode = access_token || access_code || code;
                this.redirectLink = redirect_url;
                this.currentState = AuthorizeState.auth;
            } else if (this.action === 'restore_password') {
                this.currentState = AuthorizeState.reset;
            } else if (this.action === 'activate') {
                await this.cloudService.activate(this.loginCode).catch(err => console.error(err));
                this.fromEmail$.next(true);
                this.activated$.next(true);
                this.currentState = AuthorizeState.activate;
            } else if (this.action === 'register' || this.clientType === ClientType.create) {
                this.currentState = AuthorizeState.create;
            } else if (this.action === 'reset_request') {
                this.currentState = AuthorizeState.request;
            } else if (this.clientType.includes('Password')) { // confirmPassword clientTypes
                this.loginEmail = email;
                this.emailLocked = true;
                this.currentState = AuthorizeState.password;
            } else {
                const { scope } = this.initialData;
                let verifiedCheck = of(true);
                if (scope && !this.initialData.redirect_url.includes(this.window.location.origin)) {
                    const findId = scope.match(/cloudSystemId=(?<systemId>.[\w\d-]+)/);
                    if (findId?.groups.systemId) {
                        verifiedCheck = this.verifyRedirectUrl(findId.groups.systemId);
                    }
                }
                verifiedCheck.subscribe((verified) => {
                    if (email) {
                        this.loginEmail = email;
                        this.checkEmailProcess.run();
                    }
                    this.currentState = verified ? AuthorizeState.email : AuthorizeState.notSecure;
                });
            }
        });
    }

    handleCloudConnectionError(err: any, process: Process) {
        if (err && (
            [500, 503, 504].includes(err.status) ||
            err.message?.includes('timeout') ||
            (typeof err === 'string' && err.includes('Error occured while trying to proxy to:')) || // occurs when wifi on machine turned off
            err instanceof ProgressEvent // occurs when virtual machine connection turned off (offline testing)
        )) {
            this.errorType = err.status === 503 ? 'maintenance' : 'connection';
            this.errorDialogProcess = process;
            this.errorDialog$.next(true);
        }
    }

    handleLoginSuccess = async ({ link = this.redirectLink, code = this.loginCode }: { link?: string, code?: string }) => {
        // bypass for code or backup code for resetPassword workflow
        if (this.action === 'restore_password' && [AuthorizeState.auth, AuthorizeState.backup].includes(this.currentState)) {
            this.errorDialog$.value && this.errorDialog$.next(false);
            this.action = undefined;
            this.confirmReset = true;
            this.currentState = AuthorizeState.reset;
            return;
        }

        if (this.clientType === 'renewSessionWeb') {
            this.localStorageService.store(this.CONFIG.oauthStore.verify2fa, code);
            this.window.close();
            return;
        }
        if (this.clientType === 'system2faAuth') {
            this.localStorageService.store(this.CONFIG.oauthStore.verify2fa, code);
        }
        const params = link?.includes('?') && new URLSearchParams(
            link.match(/.*(\?.*)/i)[1]
        );

        if (!code && link) {
            // unit tests should look for: startsWith 'http', '?code=', and 'redirect-oauth'
            // match groups the ? + queryParams
            code = params.get('code');
        }
        this.errorDialog$.value && this.errorDialog$.next(false);
        // undefined link case for when using access_token and 2fa needed when connecting to a system from desktop
        // @ts-ignore
        if (link?.includes('redirect-oauth') || (this.window.nativeClient && !link)) {
            const { client_id, client_type, access_code, access_token } = this.initialData;
            // @ts-ignore
            if (this.window.nativeClient &&
                [ClientType.renewDesktop, ClientType.renewWeb].includes(this.clientType) &&
                (access_code || access_token || code)
            ) {
                // @ts-ignore
                nativeClient.twoFaVerified(access_code || code || access_token);
            } else {
                this.router.navigate(['redirect-oauth'], {
                    queryParams: { client_id, client_type, view_type: this.viewType, code: code || access_code }
                });
            }
        } else if (this.clientType === 'setupWizard') {
            this.initialData.redirect_url = link;
            this.currentState = AuthorizeState.confirm;
        } else {
            this.redirect(link);
        }
    }

    handleVerificationExpiration(process) {
        if (this.loginEmail && this.loginPassword) {
            this.login().then(
                ({ code, link }) => {
                    this.loginCode = code;
                    this.redirectLink = link;
                    process.run();
                });
        } else {
            this.clientType = ClientType.renewWeb;
            this.setCurrentState(AuthorizeState.email);
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
                ignoreUnauthorized: true,
                ignoreError: true,
                timeoutMs
            },
            res => {
                this.handleLoginSuccess(res);
            },
            err => {
                if (err?.resultCode) {
                    if (['notAuthorized', 'forbidden'].includes(err.resultCode)) {
                        this.passwordErrorCode = 'wrongPassword';
                    } else if (err.resultCode === 'accountBlocked') {
                        this.passwordErrorCode = 'lockedOut';
                    }
                // error message exists when 2fa is required
                } else if (err?.error === 'second_factor_required') {
                    this.loginCode = err.access_code || err.code;
                    this.redirectLink = err.link;
                    this.currentState = AuthorizeState.auth;
                } else {
                    console.error('err from loginProcess', err);
                    this.handleCloudConnectionError(err, this.loginProcess);
                }
            }
        );

        this.checkAuthCodeProcess = this.processService.createProcess(
            () => {
                this.authCodeErrorCode = '';
                return this.action === 'restore_password'
                    ? this.cloudService.restorePassword(this.loginCode, this.resetPassword, this.authCode)
                    : this.cloudService.verifyCode(this.authCode, this.loginCode).toPromise();
            },
            {
                ignoreUnauthorized: true,
                ignoreError: true,
                timeoutMs
            },
            res => {
                if (res.resultCode === 'ok') {
                    this.handleLoginSuccess({});
                }
            },
            err => {
                if (err?.resultCode === 'notAuthorized') {
                    this.handleVerificationExpiration(this.checkAuthCodeProcess);
                } else if (err?.resultCode === 'invalidTotp' || err?.errorText === '2FA is required') {
                    this.authCodeErrorCode = 'wrongAuthCode';
                } else {
                    console.error('err from checkAuthCodeProcess', err);
                    this.handleCloudConnectionError(err, this.checkAuthCodeProcess);
                }
            }
        );

        // need to test that it's working properly after backup creation endpoint updated
        this.checkBackupCodeProcess = this.processService.createProcess(
            async () => {
                this.backupCodeErrorCode = '';
                return this.action === 'restore_password'
                    ? this.cloudService.restorePassword(this.loginCode, this.resetPassword, this.backupCode, true)
                    : this.cloudService.verifyBackupCode(this.backupCode, this.loginCode).toPromise();
            },
            { ignoreError: true, timeoutMs },
            res => {
                if (res.resultCode === 'ok') {
                    this.handleLoginSuccess({});
                }
            },
            err => {
                if (err?.resultCode === 'notAuthorized') {
                    this.handleVerificationExpiration(this.checkBackupCodeProcess);
                } else if (err?.resultCode === 'invalidBackupCode' || err?.errorText === '2FA is required') {
                    this.backupCodeErrorCode = 'wrongBackupCode';
                } else {
                    console.error('err from checkBackupCodeProcess', err);
                    this.handleCloudConnectionError(err, this.checkBackupCodeProcess);
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
                this.loginCode)
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
            () => {
                this.resetRequestErrorCode = '';
                return this.cloudService.restorePasswordRequest(
                    this.resetPasswordEmail
                );
            },
            { ignoreError: true, timeoutMs },
            () => {
                this.errorDialog$.value && this.errorDialog$.next(false);
                this.loginEmail = this.resetPasswordEmail;
                this.confirmRequest = true;
            },
            err => {
                if (err.resultCode === 'notFound') {
                    this.resetRequestErrorCode = 'accountDoesNotExist';
                }
                console.error('err in reset request process', err);
                this.handleCloudConnectionError(err, this.resetRequestProcess);
            }
        );

        this.resetPasswordProcess = this.processService.createProcess(
            () => this.cloudService.restorePassword(this.loginCode, this.resetPassword),
            { ignoreError: true, timeoutMs, ignoreUnauthorized: true },
            () => {
                this.errorDialog$.value && this.errorDialog$.next(false);
                this.confirmReset = true;
            },
            err => {
                console.error('err in resetPassword process', err);
                if (err.errorText === '2FA is required') {
                    this.currentState = AuthorizeState.auth;
                } else if (['unauthorized', 'badUsername'].includes(err.errorText)) {
                    // loginCode is either invalid or already used
                    this.toastService.notify(
                        this.LANG.authorize.newPassInvalidCode(),
                        'danger'
                    );
                } else {
                    this.handleCloudConnectionError(err, this.resetPasswordProcess);
                }
            }
        );

        this.loginPostExternalProcess = this.processService.createProcess(() => {
            this.currentState = AuthorizeState.password;
            return Promise.resolve();
        });
    }

    login = () => {
        return this.cloudService.authenticate(
            this.loginEmail,
            this.loginPassword,
            this.initialData.client_id, // use for testing || 'cloud',
            this.initialData.redirect_url, // || 'http://localhost:9000/',
            this.initialData.response_type, // || 'code',
            this.initialData.state,
            this.initialData.scope,
            this.initialData.signature
        );
    }

    checkIfActivated = async() => {
        const { active } = await this.cloudService.checkIfEmailExistsInCloud(this.loginEmail);
        if (active) {
            this.activated$.next(true);
        }
    }

    reactivate = () => {
        return this.cloudService.reactivate(this.loginEmail)
            .then(() => {
                this.toastService.notify(
                    this.LANG.authorize.emailSent(),
                    'success'
                );
            });
    }

    redirect = (route?: string) => {
        this.window.location.href = route || this.initialData.redirect_url || '/';
    }

    ngOnDestroy() {}
}
