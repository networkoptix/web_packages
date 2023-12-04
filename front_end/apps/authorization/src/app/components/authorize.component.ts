/* eslint-disable camelcase */
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
    Component,
    ElementRef,
    HostListener,
    Inject,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { CookieService } from 'ngx-cookie-service';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, fromEvent, lastValueFrom, Observable, of } from 'rxjs';
import { catchError, debounceTime, map } from 'rxjs/operators';

import { AuthService } from '@authorization/src/app/auth.service';
import { ToastType } from '@components/toast-container/toast.types';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxCloudApiService } from '@services/nx-cloud-api';
import {
    AuthenticateResp,
    AuthorizeParams,
    ClientType,
} from '@services/nx-cloud-api/nx-cloud-api.types';
import { nxConfig } from '@services/nx-config/config';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { ModuleInformationReply } from '@services/system-api.types';
import { NxThemeService } from '@services/theme.service';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';
import { oauthStore } from '@static-variables';
import { ViewportBreakpoints } from '@styles/theme-variables-common';

import { AuthorizeState } from './authorize.component.types';

require('what-input');

const AUTH_BREAKPOINT = 355;
const AUTH_WINDOW_HEIGHT = 480;

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-component',
    templateUrl: 'authorize.component.html',
    styleUrls: ['authorize.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxAuthorizeComponent implements OnInit, OnDestroy {
    CONFIG = nxConfig;
    LANG = staticLang;
    AuthorizeState = AuthorizeState;

    // content = {};
    footerItems: { name: string; url: string }[];
    companyLink: string;
    companyName: string;

    // shared
    currentState: AuthorizeState;
    clientType: ClientType;
    viewType: 'desktop' | 'mobile' | 'web';
    windowLargeEnough = false;
    windowSmallEnough = false;
    showScrollbar = false;
    initialData: AuthorizeParams;
    checkEmailProcess: Process;
    loginCode: string;
    emailLocked = false;
    action: 'restore_password' | 'activate' | 'register' | 'reset_request' | '404';

    // email
    loginEmail: string;
    isMobileClient: boolean;
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

    // resend activation
    resendActivateTimeout = 3000; // 3 seconds
    blockResendingActivation = false;

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

    // bind
    code: string;

    @HostListener('document:keypress', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        // Mobile Chrome only uses key, but desktop uses code & key
        if (['Enter', 'NumpadEnter'].includes(event.code || event.key)) {
            this.elem.nativeElement
                .querySelector<HTMLButtonElement>('button.on-keypress-enter')
                .click();
        }
    }

    constructor(
        private httpClient: HttpClient,
        private route: ActivatedRoute,
        private authService: AuthService,
        private cloudService: NxCloudApiService,
        private processService: NxProcessService,
        private router: Router,
        private elem: ElementRef<HTMLElement>,
        private title: Title,
        private localStorageService: LocalStorageService,
        private toastService: NxToastService,
        private themeService: NxThemeService,
        private cookieService: CookieService,
        @Inject(WINDOW) public window: Window,
    ) {}

    private verifyRedirectUrlHelper(systemId: string): Observable<boolean> {
        const systemUrl = this.CONFIG.trafficRelayHost.replace('{systemId}', systemId);
        const redirectPort = new URL(this.initialData.redirect_uri).port;
        const localProxy = this.cookieService.get('cors_bypass') || '';
        return this.httpClient.get(`${localProxy}https://${systemUrl}/rest/v1/servers/*/info`).pipe(
            untilDestroyed(this),
            map((servers: ModuleInformationReply[]) => {
                return servers?.some(
                    ({ port, remoteAddresses }) =>
                        redirectPort === port.toString() &&
                        remoteAddresses.some(address =>
                            this.initialData.redirect_uri.includes(address),
                        ),
                );
            }),
            catchError(() => of(false)),
        );
    }

    private checkRedirectUrl(): Promise<boolean> {
        const { scope } = this.initialData;
        let verifiedCheck = of(true);
        if (scope && !this.initialData.redirect_uri.includes(this.window.location.origin)) {
            const findId = scope.match(/cloudSystemId=(?<systemId>.[\w\d-]+)/);
            if (findId?.groups.systemId) {
                verifiedCheck = this.verifyRedirectUrlHelper(findId.groups.systemId);
            }
        }
        return verifiedCheck.toPromise();
    }

    // method only used by child components to transition between child components
    setCurrentState(state: string): void {
        // when user uses link to go directly to create-account and presses back, sets them into normal login clientTypes
        if (state === 'email' && this.clientType === ClientType.create) {
            this.clientType = environment.isLocal
                ? ClientType.loginWebadmin
                : ClientType.loginCloud;
        }
        this.currentState = AuthorizeState[state];
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.title.setTitle(`${this.LANG.pageTitles.auth} - ${this.CONFIG.cloudName}`);
        });
        this.footerItems = this.CONFIG.dynamicMenus?.footer?.nodes || [];
        this.companyLink = this.CONFIG.company.links.website;
        this.companyName = this.CONFIG.company.name;
        this.initProcesses();

        this.action = this.route.snapshot?.data?.action;
        if (this.action) {
            this.loginCode = this.route.snapshot.params.code;
            if (this.loginCode) {
                if (atob(this.loginCode).split(':').length === 2) {
                    this.loginEmail = atob(this.loginCode).split(':')[1];
                } else if (this.action === 'activate') {
                    this.action = '404';
                }
                this.fromInvite = this.action === 'register';
            }
        }
        this.route.queryParams.subscribe(async (params: AuthorizeParams) => {
            this.initialData = cloneDeep(params);
            this.isMobileClient = this.initialData.view_type === 'mobile';
            this.initialData.email &&= this.initialData.email.replace(' ', '+');
            if (this.window.nativeClient && !this.initialData.email) {
                const clientEmail = nativeClient.username && (await nativeClient?.username());
                if (clientEmail) {
                    this.initialData.email = clientEmail;
                }
            }
            const clientType =
                this.initialData.client_type ||
                this.localStorageService.retrieve('client_type') ||
                'loginCloud';
            this.clientType = ClientType[clientType];
            this.viewType = this.initialData.view_type || 'web';
            if (this.viewType === 'desktop') {
                this.themeService.setTheme('dark', undefined);
            }
            const isWeb = this.viewType === 'web' && this.initialData.client_id === 'webadmin';

            this.windowLargeEnough =
                this.window.innerWidth > ViewportBreakpoints.Tablet.height &&
                this.window.innerHeight > ViewportBreakpoints.Tablet.width &&
                this.viewType === 'web';
            this.windowSmallEnough = this.window.innerWidth <= AUTH_BREAKPOINT;
            this.showScrollbar = this.window.innerHeight < AUTH_WINDOW_HEIGHT;
            fromEvent<Event>(this.window, 'resize')
                .pipe(debounceTime(100))
                .subscribe(event => {
                    const { innerHeight, innerWidth } = event.target as Window;
                    this.windowLargeEnough =
                        innerWidth > ViewportBreakpoints.Tablet.height &&
                        innerHeight > ViewportBreakpoints.Tablet.width &&
                        this.viewType === 'web';
                    this.windowSmallEnough = innerWidth <= AUTH_BREAKPOINT;
                    this.showScrollbar = innerHeight < AUTH_WINDOW_HEIGHT;
                });

            if ([ClientType.loginCloud, ClientType.create].includes(this.clientType)) {
                this.initialData.client_id = 'cloud';
                this.initialData.redirect_uri ||= '';
                this.initialData.response_type = 'code';
            }

            // Add backwards support for redirect_url. If redirect_uri exists it should take priority.
            this.initialData.redirect_uri ||= this.initialData.redirect_url || '/systems';

            const { access_token, access_code, code, email, redirect_uri } = this.initialData;
            const skipTo2FaClientTypes = [
                'renewSessionDesktop',
                'renewSessionWeb',
                'openClientFromCloud',
                'system2faAuth',
            ];
            if (
                skipTo2FaClientTypes.includes(this.clientType) &&
                (access_token || access_code || code)
            ) {
                this.emailLocked = true;
                this.loginEmail = email;
                this.loginCode = access_token || access_code || code;
                this.redirectLink = redirect_uri;
                this.currentState = AuthorizeState.auth;
            } else if (this.action === '404') {
                this.currentState = AuthorizeState.show404;
            } else if (this.action === 'restore_password') {
                this.currentState = AuthorizeState.reset;
            } else if (this.action === 'activate') {
                await lastValueFrom(
                    this.cloudService.activate(this.loginCode).pipe(
                        catchError(err => {
                            console.error(err);
                            return this.authService.activate(this.loginCode);
                        }),
                    ),
                ).catch(err => console.error(err));
                this.fromEmail$.next(true);
                this.activated$.next(true);
                this.currentState = AuthorizeState.activate;
            } else if (this.action === 'register' || this.clientType === ClientType.create) {
                this.currentState = AuthorizeState.create;
            } else if (this.action === 'reset_request') {
                this.currentState = AuthorizeState.request;
            } else if (this.clientType.includes('Password')) {
                // confirmPassword clientTypes
                this.loginEmail = email;
                this.emailLocked = true;
                this.currentState =
                    !isWeb || (await this.checkRedirectUrl())
                        ? AuthorizeState.password
                        : AuthorizeState.notSecure;
            } else {
                if (email) {
                    this.emailLocked = true;
                    this.loginEmail = email;
                    this.checkEmailProcess.run();
                }
                if (isWeb && this.clientType === ClientType.connect) {
                    this.currentState = AuthorizeState.notSecure;
                } else {
                    this.currentState =
                        !isWeb || (await this.checkRedirectUrl())
                            ? AuthorizeState.email
                            : AuthorizeState.notSecure;
                }
            }
        });
    }

    handleCloudConnectionError(
        err: HttpErrorResponse | string | ProgressEvent,
        process: Process,
    ): void {
        if (
            err &&
            ([500, 503, 504].includes((err as HttpErrorResponse).status) ||
                (err as HttpErrorResponse).message?.includes('timeout') ||
                (typeof err === 'string' &&
                    err.includes('Error occurred while trying to proxy to:')) || // occurs when wifi on machine turned off
                err instanceof ProgressEvent) // occurs when virtual machine connection turned off (offline testing)
        ) {
            this.errorType =
                (err as HttpErrorResponse).status === 503 ? 'maintenance' : 'connection';
            this.errorDialogProcess = process;
            this.errorDialog$.next(true);
        }
    }

    handleLoginSuccess = async ({
        link = this.redirectLink,
        code = this.loginCode,
    }: AuthenticateResp): Promise<void> => {
        if (
            ClientType[this.initialData.client_type] === ClientType.connect &&
            this.initialData.system_name
        ) {
            this.currentState = AuthorizeState.bind;
            this.code = code;
            return;
        }
        // bypass for code or backup code for resetPassword workflow
        if (
            this.action === 'restore_password' &&
            [AuthorizeState.auth, AuthorizeState.backup].includes(this.currentState)
        ) {
            this.hideError();
            this.action = undefined;
            this.confirmReset = true;
            this.currentState = AuthorizeState.reset;
            return;
        }

        if (this.clientType === 'renewSessionWeb' && this.initialData.client_id === 'cloud') {
            const key =
                ClientType[this.initialData.client_type] === ClientType.renewWeb2FA
                    ? oauthStore.code
                    : oauthStore.verify2fa;
            this.localStorageService.store(key, code);
            this.window.close();
            return;
        }
        if (this.clientType === 'system2faAuth') {
            this.localStorageService.store(oauthStore.verify2fa, code);
        }

        if (this.clientType === 'renewSessionWeb2FA') {
            this.redirectLink = link;
            this.loginCode = code;
            this.currentState = AuthorizeState.auth;
            this.clientType = ClientType.renewWeb;
            return;
        }
        const params = link?.includes('?') && new URLSearchParams(link.match(/.*(\?.*)/i)[1]);

        if (!code && link) {
            // unit tests should look for: startsWith 'http', '?code=', and 'redirect-oauth'
            // match groups the ? + queryParams
            code = params.get('code');
        }
        this.hideError();
        // @es-ignore undefined link case for when using access_token and 2fa needed when connecting to a system from desktop
        if (link?.includes('redirect-oauth') || (this.window.nativeClient && !link)) {
            const { client_id, client_type, access_code, access_token } = this.initialData;
            if (
                this.window.nativeClient &&
                [ClientType.renewDesktop, ClientType.renewWeb].includes(this.clientType) &&
                (access_code || access_token || code)
            ) {
                nativeClient.twoFaVerified(access_code || code || access_token);
            } else {
                this.router.navigate(['redirect-oauth'], {
                    queryParams: {
                        client_id,
                        client_type,
                        view_type: this.viewType,
                        code: code || access_code,
                    },
                });
            }
        } else if (this.clientType === 'setupWizard') {
            this.initialData.redirect_uri = link;
            this.currentState = AuthorizeState.confirm;
        } else {
            this.redirect(link);
        }
    };

    handleVerificationExpiration(process: Process): void {
        if (this.loginEmail && this.loginPassword) {
            this.login().then(({ code, link }) => {
                this.loginCode = code;
                this.redirectLink = link;
                process.run();
            });
        } else {
            this.clientType = ClientType.renewWeb;
            this.setCurrentState(AuthorizeState.email);
        }
    }

    initProcesses(): void {
        // 3 seconds was creating too many false positives
        // 60 seconds should cover most cases unless we discover different edge cases we need to address
        const timeoutMs = 60000;
        this.checkEmailProcess = this.processService.createProcess(
            async () => {
                this.emailErrorCode = '';
                const res = await lastValueFrom(
                    this.authService.checkIfEmailExistsInCloud(this.loginEmail),
                );
                if (
                    this.currentState === AuthorizeState.activate &&
                    res.statusCode === 'activated'
                ) {
                    return this.login();
                }
                return Promise.resolve(res);
            },
            { ignoreError: true, timeoutMs },
            ({ emailExists, active }) => {
                this.hideError();
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
            },
        );

        this.loginProcess = this.processService.createProcess(
            () => {
                this.passwordErrorCode = '';
                return this.login();
            },
            {
                ignoreUnauthorized: true,
                ignoreError: true,
                timeoutMs,
            },
            res => {
                this.handleLoginSuccess(res);
            },
            err => {
                if (err?.resultCode) {
                    if (['notAuthorized', 'forbidden'].includes(err.resultCode)) {
                        this.passwordErrorCode =
                            err?.errorData?.error !== 'access_denied'
                                ? 'wrongPassword'
                                : 'accountNotAccessSystem';
                    } else if (err.resultCode === 'accountBlocked') {
                        this.passwordErrorCode = 'lockedOut';
                    }
                    // error message exists when 2fa is required
                } else if (err?.errorText === 'second_factor_required') {
                    this.loginCode = err.access_code || err.code;
                    this.redirectLink = err.link;
                    this.currentState = AuthorizeState.auth;
                } else {
                    console.error('err from loginProcess', err);
                    this.handleCloudConnectionError(err, this.loginProcess);
                }
            },
        );

        this.checkAuthCodeProcess = this.processService.createProcess(
            () => {
                this.authCodeErrorCode = '';
                if (
                    this.clientType === ClientType.system2faAuth &&
                    !this.initialData.redirect_uri.includes('redirect-oauth')
                ) {
                    const accessCodeOrToken =
                        this.initialData.access_code || this.initialData.access_token;
                    return this.cloudService.verify2FaKey(this.authCode, accessCodeOrToken);
                }

                return lastValueFrom(
                    this.action === 'restore_password'
                        ? this.authService.restorePassword(
                              this.loginCode,
                              this.resetPassword,
                              this.authCode,
                          )
                        : this.authService.verifyTotp(this.authCode, this.loginCode),
                );
            },
            {
                ignoreUnauthorized: true,
                ignoreError: true,
                timeoutMs,
            },
            res => {
                // no success message if password restored, just returns user object
                if (this.action === 'restore_password' && res.email) {
                    this.hideError();
                    this.confirmReset = true;
                    this.setCurrentState('reset');
                }
                if (res.resultCode === 'ok') {
                    this.handleLoginSuccess({});
                }
            },
            err => {
                if (err?.resultCode === 'notAuthorized') {
                    this.handleVerificationExpiration(this.checkAuthCodeProcess);
                } else if (
                    err?.resultCode === 'invalidTotp' ||
                    err?.errorText === '2FA is required'
                ) {
                    this.authCodeErrorCode = 'wrongAuthCode';
                } else {
                    console.error('err from checkAuthCodeProcess', err);
                    this.handleCloudConnectionError(err, this.checkAuthCodeProcess);
                }
            },
        );

        // need to test that it's working properly after backup creation endpoint updated
        this.checkBackupCodeProcess = this.processService.createProcess(
            async () => {
                this.backupCodeErrorCode = '';
                if (
                    this.clientType === ClientType.system2faAuth &&
                    !this.initialData.redirect_uri.includes('redirect-oauth')
                ) {
                    const accessCodeOrToken =
                        this.initialData.access_code || this.initialData.access_token;
                    return lastValueFrom(
                        this.cloudService.verifyBackupCode(this.backupCode, accessCodeOrToken),
                    );
                }
                return lastValueFrom(
                    this.action === 'restore_password'
                        ? this.authService.restorePassword(
                              this.loginCode,
                              this.resetPassword,
                              this.backupCode,
                              true,
                          )
                        : this.authService.verifyBackupCode(this.backupCode, this.loginCode),
                );
            },
            { ignoreError: true, timeoutMs },
            res => {
                if (this.action === 'restore_password' && res.email) {
                    this.hideError();
                    this.confirmReset = true;
                    this.setCurrentState('reset');
                }
                if (res.resultCode === 'ok') {
                    this.handleLoginSuccess({});
                }
            },
            err => {
                if (err?.resultCode === 'notAuthorized') {
                    this.handleVerificationExpiration(this.checkBackupCodeProcess);
                } else if (
                    err?.resultCode === 'invalidBackupCode' ||
                    err?.errorText === '2FA is required'
                ) {
                    this.backupCodeErrorCode = 'wrongBackupCode';
                } else {
                    console.error('err from checkBackupCodeProcess', err);
                    this.handleCloudConnectionError(err, this.checkBackupCodeProcess);
                }
            },
        );

        // use factory if account properties are not needed outside of the create component
        // this.createProcessFactory = (props) => this.processService.createProcess(() => {
        this.createProcess = this.processService.createProcess(
            () =>
                this.cloudService.registerUser(
                    this.accountInfo.email,
                    this.accountInfo.password,
                    this.accountInfo.firstName,
                    this.accountInfo.lastName,
                    this.loginCode,
                ),
            { ignoreError: true, timeoutMs },
            res => {
                this.hideError();
                if (res.resultCode === 'alreadyExists') {
                    this.createErrorCode = ['email', 'alreadyExists'];
                } else if (res.resultCode === 'portalError') {
                    // errorText: 'User is not in portal'
                    this.createErrorCode = ['email', 'portalError'];
                } else {
                    // in the case when code is passed with registration (ie when user gets invited to system)
                    if (res.statusCode === 'activated') {
                        this.activated$.next(true);
                    }

                    this.loginEmail = this.accountInfo.email;
                    this.currentState = AuthorizeState.activate;
                    if (res.activated || res.statusCode === 'activated') {
                        this.activated$.next(true);
                    }
                }
            },
            err => {
                if (err.resultCode === 'alreadyExists') {
                    this.createErrorCode = ['email', 'alreadyExists'];
                } else {
                    this.handleCloudConnectionError(err, this.createProcess);
                }
            },
        );

        this.resetRequestProcess = this.processService.createProcess(
            () => {
                this.resetRequestErrorCode = '';
                return lastValueFrom(this.authService.resetPassword(this.resetPasswordEmail));
            },
            { ignoreError: true, timeoutMs },
            () => {
                this.hideError();
                this.loginEmail = this.resetPasswordEmail;
                this.confirmRequest = true;
            },
            err => {
                if (err.resultCode === 'notFound') {
                    this.resetRequestErrorCode = 'accountDoesNotExist';
                }
                console.error('err in reset request process', err);
                this.handleCloudConnectionError(err, this.resetRequestProcess);
            },
        );

        this.resetPasswordProcess = this.processService.createProcess(
            () =>
                lastValueFrom(this.authService.restorePassword(this.loginCode, this.resetPassword)),
            { ignoreError: true, timeoutMs, ignoreUnauthorized: true },
            () => {
                this.hideError();
                this.confirmReset = true;
            },
            err => {
                console.error('err in resetPassword process', err);
                if (err.errorText === '2FA is required') {
                    this.currentState = AuthorizeState.auth;
                } else if (['unauthorized', 'badUsername'].includes(err.errorText)) {
                    // loginCode is either invalid or already used
                    this.toastService.notify(
                        this.LANG.authorize.newPassInvalidCode,
                        ToastType.Danger,
                    );
                } else {
                    this.handleCloudConnectionError(err, this.resetPasswordProcess);
                }
            },
        );

        this.loginPostExternalProcess = this.processService.createProcess(() => {
            this.loginCode = undefined;
            this.action = undefined;
            this.currentState = AuthorizeState.password;
            return Promise.resolve();
        });
    }

    login = (): Promise<AuthenticateResp> => {
        return lastValueFrom(
            this.authService.authenticate(
                this.loginEmail,
                this.loginPassword,
                this.initialData.client_id, // use for testing || 'cloud',
                this.initialData.redirect_uri, // || 'http://localhost:9000/',
                this.initialData.state,
                this.initialData.scope,
            ),
        );
    };

    checkIfActivated = async (): Promise<void> => {
        const { active } = await lastValueFrom(
            this.authService.checkIfEmailExistsInCloud(this.loginEmail),
        );
        if (active) {
            this.activated$.next(true);
        }
    };

    reactivate = (): Promise<void> => {
        if (this.blockResendingActivation) {
            return;
        }
        this.blockResendingActivation = true;
        return lastValueFrom(this.authService.reactivate(this.loginEmail))
            .then(() => {
                this.toastService.notify(this.LANG.authorize.emailSent, ToastType.Success);
            })
            .finally(() => {
                setTimeout(() => {
                    this.blockResendingActivation = false;
                }, this.resendActivateTimeout);
            });
    };

    redirect = (route?: string): void => {
        this.window.location.href = route || this.initialData.redirect_uri || '/';
    };

    hideError(): void {
        if (this.errorDialog$.value) {
            this.errorDialog$.next(false);
        }
    }

    ngOnDestroy(): void {}
}
