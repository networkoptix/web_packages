import { Inject, OnDestroy, Injector, Injectable } from '@angular/core';
import { DOCUMENT, Location }                      from '@angular/common';
import { Router }                                         from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BehaviorSubject, Observable, of, Subscription }  from 'rxjs';

import { NxConfigService, IConfig }                       from '../nx-config';
import { NxCloudApiService }                              from '../nx-cloud-api';
import { NxLanguageProviderService }                      from '../nx-language-provider';
import { NxDialogsService }                from '@dialogs/dialogs.service';
import { NxSessionService }                from '../session.service';
import { NxApplyService }                  from '../apply.service';
import { WINDOW }                          from '../window-provider';
import { NxAppStateService }               from '../nx-app-state.service';
import { NxUriService }                    from '../uri.service';
import { NxPollService }                   from '../poll.service';
import { NxUtilsService }                  from '../utils.service';
import { NxSystemAPIService, NxSystemRestAPI } from '../system-api.service';
import { Account }                         from './account';
import { LanguageI18NStaticTypes }         from '@app/language_i18n_static_types';
import { NxStorageService }                from '../storage.service';

interface IParams<Value = any> {
    [key: string]: Value;
}

/**
 * BaseAccount is an abstract class extended by CloudAccount and LocalAccount.
 * CloudAccount and LocalAccount overrides should maintain same interface
 * as BaseAccount.
 */
@Injectable()
export abstract class BaseAccount implements OnDestroy {
    protected CONFIG: IConfig;
    protected LANG: LanguageI18NStaticTypes;
    protected location: Location;
    accountSubject = new BehaviorSubject<Account>(undefined);
    protected loggingOut: boolean;
    protected requestingLogin: any;
    protected loginDialogActive: boolean;
    protected loginWithAuthKeyInProgress: boolean;

    protected accountPoll: Observable<Account | string>;
    protected accountPollSubscription: Subscription;
    protected loginSubscription: Subscription;
    protected queryParamSubscription: Subscription;

    // Declare services that cause circular dependencies here instead of injecting in constructor
    dialogs: NxDialogsService;
    protected applyService: NxApplyService;
    public mediaServerApi: any;

    // Abstract methods implemented by cloud and local versions
    abstract logoutHelper(doNotRedirect?: boolean, skipReload?: boolean): void;
    abstract get(forceUpdate?: boolean): Promise<Account>;
    abstract login(email: string, password: string, remember?: boolean, navigateHome?: boolean): any;
    abstract logout(doNotRedirect?: boolean, skipReload?): void;
    abstract requireLogin(): Promise<any>;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        locationService: Location,
        @Inject(DOCUMENT) protected document: Document,
        @Inject(WINDOW) protected window: Window,
        protected cloudApi: NxCloudApiService,
        protected sessionService: NxSessionService,
        protected uriService: NxUriService,
        protected storageService: NxStorageService,
        protected router: Router,
        protected appStateService: NxAppStateService,
        protected pollService: NxPollService,
        injector: Injector,
        protected nxSystemAPIService: NxSystemAPIService
    ) {
        this.CONFIG = configService.getConfig();
        languageService.translateSubject.subscribe((lang) => { this.LANG = lang; });
        this.location = locationService;
        this.loggingOut = false;
        this.loginDialogActive = false;
        this.loginWithAuthKeyInProgress = false;

        // Distinct until changed is used to prevent the logout function from looping.
        this.loginSubscription = this.sessionService.loginStateSubject
            .pipe(debounceTime(500), distinctUntilChanged())
            .subscribe((loginState) => {
                if (loginState === null) {
                    this.logout();
                } else if (loginState !== '' && !this.CONFIG.isLocal) {
                    this.get()
                        .then((account) => {
                            // prevent stale loginState
                            if (account) {
                                this.startAccountPoll();
                            } else {
                                this.clearLoginState();
                            }
                        });
                }
            });

        // Handles login with auth param everywhere.
        this.queryParamSubscription = this.uriService.queryParamsSubject
            .subscribe((params: IParams) => {
                if (params.auth) {
                    this.handleAuthKeyLogin(params.auth);
                }
            });

        if (!this.CONFIG.isLocal) {
            this.accountPoll = this.pollService.createPoll(() => this.cloudApi.account(true), this.CONFIG.updateInterval);
        }

        // Imperatively inject any services that cause circular dependencies here instead of passing in constructor
        // setTimeout(() => {
        this.dialogs = injector.get(NxDialogsService);
        this.applyService = injector.get(NxApplyService);
    }

    ngOnDestroy() {
        this.loginSubscription.unsubscribe();
        this.queryParamSubscription.unsubscribe();
    }

    // Methods shared between local and cloud versions of account service.

    get account() {
        return this.accountSubject.getValue();
    }

    set account(account: Account) {
        if (!NxUtilsService.isEqual(account, this.account)) {
            this.accountSubject.next(account);
        }
    }

    get email() {
        return this.sessionService.email;
    }

    set email(email) {
        this.sessionService.email = email;
    }

    async authKey() {
        const { auth_key: auth } = await this.cloudApi.authKey();
        return auth;
    }

    async checkVisitedKey(key: string) {
        const { visited } = await this.cloudApi.visitedKey(key);
        return !!visited;
    }

    async checkCode(code: string) {
        const { emailExists } = await this.cloudApi.checkCode(code) as any;
        return !!emailExists;
    }

    protected clearLoginState() {
        this.stopAccountPoll();
        this.sessionService.invalidateSession();
    }

    // TODO: @Chris require login add check for !this.loginWithAuthKeyInProgress
    redirectAuthorised() {
        this.get()
            .then((account: Account) => {
                if (account && !this.CONFIG.isLocal) {
                    this.router
                        .navigate([this.CONFIG.redirect.authorised])
                        .catch(error => {
                            console.error(error);
                        });
                }
            });
    }

    redirectToHome() {
        return this.get()
            .then((account: Account) => {
                if (account) {
                    this.router
                        .navigate([this.CONFIG.redirect.authorised])
                        .catch(error => {
                            console.error(error);
                        });
                } else {
                    this.router
                        .navigate([this.CONFIG.redirect.unauthorised])
                        .catch(error => {
                            console.error(error);
                        });
                }
            }).catch(() => {
                this.router
                    .navigate([this.CONFIG.redirect.unauthorised])
                    .catch(error => {
                        console.error(error);
                    });
            });
    }

    reactivate(email) {
        return this.cloudApi.reactivate(email);
    }

    disconnect(systemId, userPassword) {
        return this.cloudApi.disconnect(systemId, userPassword).toPromise();
    }

    connect(systemName, userEmail, userPassword) {
        return this.cloudApi.connect(systemName, userEmail, userPassword);
    }

    verify(password) {
        return this.cloudApi.verify(password);
    }

    toggle2fa(password, totp) {
        return this.cloudApi.toggle2fa(password, totp);
    }

    get2FaKey() {
        return this.cloudApi.get2FaKey();
    }

    get2FaBackupCode() {
        return this.cloudApi.get2FaBackupCode();
    }

    verify2FaKey(accessCode, verificationCode) {
        return this.cloudApi.verify2FaKey(accessCode, verificationCode);
    }

    sendMessage(subject, asset, message, userName, userEmail) {
        return this.cloudApi.sendMessage(subject, asset, message, userName, userEmail).toPromise();
    }

    // Temporary aid for AJS
    getCredentialsFromAuth(authKey: string) {
        return atob(authKey).split(':');
    }

    loginWithAuthKey(authKey: string): Promise<boolean> {
        this.loginWithAuthKeyInProgress = true;

        const auth         = atob(decodeURIComponent(authKey)).split(':');
        const tempLogin    = auth[0];
        const tempPassword = auth[1];

        return this.login(tempLogin, tempPassword, false)
            .then(() => {
                const queryParams = { auth: undefined, from: undefined };
                return this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
            }).catch(() => {
                this.sessionService.email = '';
                // If the key login fails ask the user to login manually.
                return this.dialogs
                    .login(this, true, true)
                    .catch(() => {
                        // @ts-ignore: TODO Type Error location.path expects boolean and is being passed a string
                        this.location.path(this.CONFIG.redirect.unauthorised);
                    });
            }).finally(() => {
                this.loginWithAuthKeyInProgress = false;
            });
    }

    // TODO: @Chris check for apply service in logout functions

    logoutAuthorised(skipReload = false) {
        return this.get()
            .then((account: Account) => {
                // logoutAuthorisedLogoutButton
                if (account) {
                    const isRegister = this.router.url.includes('/register');
                    const isRestore  = this.router.url.includes('/restore_password');
                    const isActivate = this.router.url.includes('/activate');

                    let cancelLabel = '';
                    if (isRegister) {
                        cancelLabel = NxLanguageProviderService.translate(this.LANG.dialogs.buttons.createAccount);
                    } else if (isRestore) {
                        cancelLabel = NxLanguageProviderService.translate(this.LANG.dialogs.buttons.logoutAuthorised);
                    } else {
                        cancelLabel = NxLanguageProviderService.translate(this.LANG.dialogs.buttons.cancel);
                    }
                    return this.dialogs
                        .confirm('',
                            NxLanguageProviderService.translate(this.LANG.dialogs.titles.changeAccount, account),
                            NxLanguageProviderService.translate(this.LANG.dialogs.buttons.stayLoggedIn),
                            undefined,
                            cancelLabel,
                            ''
                        ).then((result) => {
                            if ((isRestore || isRegister || isActivate) && result === cancelLabel) {
                                this.logout(true, skipReload);
                                return true;
                            } else {
                                this.redirectAuthorised();
                                return false;
                            }
                        });
                }
            });
    }

    protected showLogin() {
        this.loginDialogActive = true;
        return this.dialogs
            .login(this, true, true).then((result: any) => {
                this.storageService.loginRegister = true;
                if (result === 'register') {
                    return this.router.navigate(['/register']).then(() => result);
                }
                return this.get();
            })
            .catch(() => this.router.navigate([this.CONFIG.redirect.unauthorised]))
            .finally(() => {
                this.loginDialogActive = false;
            });
    }

    protected async handleAuthKeyLogin(auth: string) {
        const account: Account = await this.get();
        try {
            const result: any = await this.cloudApi.checkAuthCode(decodeURIComponent(auth));
            if (!account) {
                return this.loginWithAuthKey(auth).then(() => this.document.location.reload());
            }
            this.appStateService.ready = true;
            if (result.email === account.email) {
                return;
            }
            const response = await this.dialogs
                .confirm('',
                    this.LANG.dialogs.titles.loggedFromOtherAccount(),
                    this.LANG.dialogs.buttons.ok(),
                    undefined,
                    NxLanguageProviderService.translate(this.LANG.dialogs.buttons.stayAs, account),
                    'long-cancel-button');

            if (response === true) {
                return this.cloudApi.logout().finally(() => {
                    this.stopAccountPoll();
                    this.account = undefined;
                    this.storageService.clear = 'all'; // Clear session
                    return this.loginWithAuthKey(auth).then(() => {
                        return this.document.location.reload();
                    });
                });
            } else {
                const queryParams = { auth: undefined, from: undefined };
                return this.router
                    .navigate([], { queryParams, queryParamsHandling: 'merge' })
                    .then(() => this.document.location.reload());
            }
        } catch (e) {
            this.appStateService.ready = true;
            this.dialogs.notify(this.LANG.errorCodes.wrongAuthCode(), 'danger', true);
            return this.requireLogin();
        }
    }

    // TODO: Need to refine return value
    protected startAccountPoll() {
        this.stopAccountPoll();
        this.accountPollSubscription = this.accountPoll.pipe(
            catchError((ex) => {
                this.logoutHelper(false);
                return of(undefined);
            })
        ).subscribe((account: Account) => {
            this.account = account;
        });
    }

    protected stopAccountPoll() {
        if (this.accountPollSubscription) {
            this.account = undefined;
            this.accountPollSubscription.unsubscribe();
        }
    }
}
