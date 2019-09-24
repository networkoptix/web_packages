import { Inject, Injectable }        from '@angular/core';
import { DOCUMENT, Location }        from '@angular/common';
import { LocalStorageService }       from 'ngx-store';
import { Router } from '@angular/router';

import { NxConfigService }           from './nx-config';
import { NxCloudApiService }         from './nx-cloud-api';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxDialogsService }          from '../dialogs/dialogs.service';
import { NxSessionService }          from './session.service';
import { NxQueryParamService }       from './query-param.service';
import { NxApplyService }            from './apply.service';

import { distinctUntilChanged } from 'rxjs/operators';
import { ReplaySubject }        from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxAccountService {
    CONFIG: any;
    LANG: any;
    location: any;
    loggingOut: boolean;
    requestingLogin: any;
    loginStateSubject = new ReplaySubject(1);

    constructor(@Inject(DOCUMENT) private document: any,
                private config: NxConfigService,
                private language: NxLanguageProviderService,
                private cloudApi: NxCloudApiService,
                private sessionService: NxSessionService,
                private queryParamService: NxQueryParamService,
                private localStorageService: LocalStorageService,
                private locationService: Location,
                private dialogs: NxDialogsService,
                private router: Router,
                private applyService: NxApplyService,
    ) {
        this.location = this.locationService;
        this.CONFIG = this.config.getConfig();
        this.LANG = this.language.getTranslations();
        this.loggingOut = false;

        // Distinct until changed is used to prevent the logout function from looping.
        this.sessionService.loginStateSubject.pipe(distinctUntilChanged()).subscribe((loginState) => {
            if (loginState === null) {
                this.logout();
            } else if (loginState !== '') {
                this.loginStateSubject.next(loginState);
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

    get() {
        if (this.requestingLogin) {
            // login is requesting, so we wait
            return this.requestingLogin
                       .then(() => {
                           this.requestingLogin = undefined; // clean requestingLogin reference
                           return this.get(); // Try again
                       });
        }
        return this.cloudApi
                   .account()
                   .then((account) => {
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
                const queryParams: any = this.queryParamService.queryParams;
                if (!account && queryParams.auth) {
                    return this.loginWithAuthKey(queryParams.auth);
                } else if (account && queryParams.auth) {
                    return this.dialogs.confirm('',
                        this.LANG.dialogs.loggedFromOther,
                        this.LANG.dialogs.okButton,
                        undefined,
                        this.LANG.dialogs.stayAs.replace('{email}', account.email),
                        'long-cancel-button'
                    ).then((result) => {
                        if (result === true) {
                            this.logout(true);
                            return this.loginWithAuthKey(queryParams.auth);
                        } else {
                            return this.redirectAuthorised();
                        }
                    });
                } else if (!account) {
                    return this.dialogs
                        .login(this, true, true).then(() => {
                            return this.get().then((account) => {
                                return account;
                            });
                        })
                        .catch(() => {
                            this.location.path(this.CONFIG.redirectUnauthorised);
                        });
                }
                return account;
            });
    }

    redirectAuthorised() {
        this.get().then((account) => {
            if (account) {
                this.location.go(this.CONFIG.redirectAuthorised);
            }
        });
    }

    redirectToHome() {
        this.get()
            .then((account) => {
                if (account) {
                    this.location.go(this.CONFIG.redirectAuthorised);
                } else {
                    this.location.go(this.CONFIG.redirectUnauthorised);
                }
            }).catch(() => {
                this.location.go(this.CONFIG.redirectUnauthorised);
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

        return this.cloudApi
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
    }

    loginWithAuthKey(authKey: string) {
        const auth = atob(authKey);
        const index = auth.indexOf(':');
        const tempLogin = auth.substring(0, index);
        const tempPassword = auth.substring(index + 1);

        return this.login(tempLogin, tempPassword, false)
            .then(() => {
                return this.router.navigate([], {queryParamsHandling: 'merge'});
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
                        this.sessionService.invalidateSession(); // Clear session
                        if (!doNotRedirect) {
                            return this.router.navigate([this.CONFIG.redirectUnauthorised])
                                .finally(this.document.location.reload());
                        }
                        setTimeout(() => {
                            this.document.location.reload();
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
}
