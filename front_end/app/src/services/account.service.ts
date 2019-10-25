import { Inject, Injectable }        from '@angular/core';
import { DOCUMENT, Location }        from '@angular/common';
import { LocalStorageService }       from 'ngx-store';
import { ActivatedRoute, Router } from '@angular/router';

import { NxConfigService }           from './nx-config';
import { NxCloudApiService }         from './nx-cloud-api';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxDialogsService }          from '../dialogs/dialogs.service';
import { NxSessionService }          from './session.service';
import { NxQueryParamService }       from './query-param.service';
import { NxApplyService }            from './apply.service';

import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ReplaySubject, timer }               from 'rxjs';
import { WINDOW }                             from './window-provider';

@Injectable({
    providedIn: 'root'
})
export class NxAccountService {
    CONFIG: any;
    LANG: any;
    location: any;
    loggingOut: boolean;
    requestingLogin: any;
    account: any;
    loginStateSubject = new ReplaySubject(1);
    loginDialogActive: boolean;

    constructor(@Inject(DOCUMENT) private document: any,
                @Inject(WINDOW) private window: Window,
                private config: NxConfigService,
                private language: NxLanguageProviderService,
                private cloudApi: NxCloudApiService,
                private sessionService: NxSessionService,
                private queryParamService: NxQueryParamService,
                private localStorageService: LocalStorageService,
                private locationService: Location,
                private dialogs: NxDialogsService,
                private router: Router,
                private activatedRoute: ActivatedRoute,
                private applyService: NxApplyService,
    ) {
        this.location = this.locationService;
        this.CONFIG = this.config.getConfig();
        this.LANG = this.language.getTranslations();
        this.loggingOut = false;
        this.loginDialogActive = false;

        // Distinct until changed is used to prevent the logout function from looping.
        this.sessionService.loginStateSubject.pipe(distinctUntilChanged()).subscribe((loginState) => {
            if (loginState === null) {
                this.logout();
            } else if (loginState !== '') {
                this.get()
                    .then((account) => {
                        // prevent stale loginState
                        if (account) {
                            this.loginStateSubject.next(loginState);
                        } else {
                            this.clearLoginState();
                        }
                    });
            }
        });

        // Handles login with auth param everywhere.
        this.queryParamService.queryParamsSubject.pipe(
            debounceTime(100), distinctUntilChanged()
        ).subscribe((params: any) => {
            if (params.auth) {
                this.handleAuthKeyLogin(params.auth);
            }
        });
    }

    clearLoginState() {
        this.sessionService.invalidateSession();
    }

    checkLoginState(): Promise<boolean> {
            return new Promise<boolean>((resolve, reject) => {
                if (this.sessionService.loginState) {
                    resolve(true);
                }

                reject(false);
            });
    }

    setupAccount(account) {
        // cleanup
        if (this.account && this.account.timer) {
            this.account.timer.unsubscribe();
        }
        this.account = account;

        // Set up timer
        const timer$ = timer(this.CONFIG.updateInterval, this.CONFIG.updateInterval);

        // Update account to unsure any external changes are applied to this session
        this.account.timer = timer$.subscribe(() => {
            this.cloudApi
                .account()
                .then((account) => {
                    this.account = account;
                })
                .catch(() => {
                    this.cloudApi
                        .logout()
                        .finally(() => {
                            this.account = undefined;
                            this.sessionService.invalidateSession(); // Clear session

                            setTimeout(() => {
                                return this.document.location.reload();
                            });
                        });
                });
        });
    }

    get() {
        if (this.requestingLogin) {
            // login is requesting, so we wait
            return this.requestingLogin
                       .then(() => {
                           this.requestingLogin = undefined; // clean requestingLogin reference
                           return this.get(); // Try again
                       });
        }

        if (this.account) {
            return new Promise(resolve => {
                return resolve(this.account);
            });
        }

        return this.cloudApi
                   .account()
                   .then((account) => {
                       this.setupAccount(account);
                       return account;
                   })
                   .catch(() => {
                       return undefined;
                   });
    }

    authKey() {
        return this.cloudApi
                   .authKey()
                   .then((result: any) => {
                       return result.auth_key;
                   });
    }

    checkVisitedKey(key) {
        return this.cloudApi
                   .visitedKey(key)
                   .then((result: any) => {
                       return result.visited;
                   });
    }

    checkCode(code) {
        return this.cloudApi
                   .checkCode(code)
                   .then((result: any) => {
                       return result.emailExists;
                   });
    }

    requireLogin() {
        return this.get()
            .then((account) => {
                if (!account && !this.loginDialogActive) {
                    this.loginDialogActive = true;
                    return this.dialogs
                        .login(this, true, true).then(() => {
                            return this.get().then((account) => {
                                return account;
                            });
                        })
                        .catch(() => {
                            this.location.path(this.CONFIG.redirectUnauthorised);
                        }).finally(() => {
                            this.loginDialogActive = false;
                        });
                } else if (this.loginDialogActive) {
                    return undefined;
                }
                return account;
            });
    }

    redirectAuthorised() {
        this.get().then((account) => {
            if (account) {
                this.router.navigate([this.CONFIG.redirectAuthorised]);
            }
        });
    }

    redirectToHome() {
        this.get()
            .then((account) => {
                if (account) {
                    this.router.navigate([this.CONFIG.redirectAuthorised]);
                } else {
                    this.router.navigate([this.CONFIG.redirectUnauthorised]);
                }
            }).catch(() => {
            this.router.navigate([this.CONFIG.redirectUnauthorised]);
            });
    }

    setEmail(email) {
        this.sessionService.email = email;
    }

    getEmail() {
        return this.sessionService.email;
    }

    login(email, password, remember) {
        this.sessionService.email = email;

        this.requestingLogin = this.cloudApi
                   .login(email, password, remember)
                   .then((result: any) => {
                       if (!this.cloudApi.checkResponseHasError(result)) {
                           if (this.sessionService.loginState) {
                               // If the user that logged in matches the current session there's no need to show
                               // the logout dialog.
                               if (result.email !== this.sessionService.loginState) {
                                   this.logoutAuthorised();
                               }

                               return Promise.resolve({ data: { resultCode: this.CONFIG.responseOk } });
                           }

                           if (result.email) { // (result.data.resultCode === L.errorCodes.ok)
                               this.sessionService.email = result.email;
                               this.sessionService.loginState = result.email; // Forcing changing loginState to reload interface
                           }

                           return Promise.resolve({ data: { resultCode: this.CONFIG.responseOk } });
                       }
                       return Promise.reject({ error: { resultCode: result.resultCode }});

                   })
                   .catch((result: any) => {
                       if (this.cloudApi.checkResponseHasError(result.error)) {
                           return Promise.reject({ resultCode: result.error.resultCode });
                       }
                   });
        return this.requestingLogin;
    }

    loginWithAuthKey(authKey: string) {
        const auth = atob(authKey).split(':');
        const tempLogin = auth[0];
        const tempPassword = auth[1];

        return this.login(tempLogin, tempPassword, false)
            .then(() => {
                const queryParams = {auth: undefined, from: undefined};
                return this.router.navigate([], { queryParams , queryParamsHandling: 'merge'});
            }).catch(() => {
                // If the key login fails ask the user to login manually.
                return this.dialogs
                    .login(this, true, true)
                    .catch(() => {
                        this.location.path(this.CONFIG.redirectUnauthorised);
                    });
            });
    }

    logout(doNotRedirect?) {
        if (this.loggingOut) {
            return;
        }

        this.applyService.canMove().then((allowed) => {
            if (allowed) {
                this.loggingOut = true;
                this.cloudApi
                    .logout()
                    .finally(() => {
                        if (this.account && this.account.timer) {
                            this.account.timer.unsubscribe();
                        }
                        this.account = undefined;
                        this.sessionService.invalidateSession(); // Clear session
                        if (!doNotRedirect) {
                            return this.router
                                       .navigate([this.CONFIG.redirectUnauthorised])
                                       .finally(() => {
                                           setTimeout(() => this.window.location.reload());
                                       });
                        }

                        setTimeout(() => {
                            return this.window.location.reload();
                        });
                    });
            }
        });
    }

    logoutAuthorised() {
        return this.get().then((account) => {
            // logoutAuthorisedLogoutButton
            if (account) {
                const isRegister = this.router.url.includes('/register');
                const isRestore = this.router.url.includes('/restore_password');

                let cancelLabel = '';
                if (isRegister) {
                    cancelLabel = this.LANG.dialogs.createNewAccount;
                } else if (isRestore) {
                    cancelLabel = this.LANG.dialogs.logoutAuthorisedLogoutButton;
                } else {
                    cancelLabel = this.LANG.dialogs.cancelButton;
                }
                return this.dialogs.confirm('',
                        this.LANG.dialogs.changeAccountLogged.replace('{email}', account.email),
                        this.LANG.dialogs.stayLoggedIn,
                        undefined,
                        cancelLabel,
                    ''
                ).then((result) => {
                    if ((isRestore || isRegister) && result === cancelLabel) {
                        return this.logout(true);
                    } else {
                        return this.redirectAuthorised();
                    }
                });
            }
            return;
        });
    }

    checkUnauthorized(data) {
        if (data && data.resultCode === 'notAuthorized') {
            this.logout(true);
            return false;
        }
        return true;
    }

    private handleAuthKeyLogin(auth) {
        this.get()
            .then((account) => {
                if (!account) {
                    return this.loginWithAuthKey(auth).then(() => {
                        return this.document.location.reload();
                    });
                }

                this.cloudApi.checkAuthCode(auth).then(async (result: any) => {
                    if (result.email === account.email) {
                        return;
                    }

                    const response = await this.dialogs
                                               .confirm('',
                                                       this.LANG.dialogs.loggedFromOther,
                                                       this.LANG.dialogs.okButton,
                                                       undefined,
                                                       this.LANG.dialogs.stayAs.replace('{email}', account.email),
                                                       'long-cancel-button')
                    if (response === true) {
                        return this.cloudApi
                                   .logout()
                                   .finally(() => {
                                       if (this.account && this.account.timer) {
                                           this.account.timer.unsubscribe();
                                       }
                                       this.account = undefined;
                                       this.localStorageService.clear('all'); // Clear session
                                       // this.sessionService.invalidateSession(); // Clear session
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
                });
            });
    }
}
