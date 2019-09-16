import { Inject, Injectable }        from '@angular/core';
import { DOCUMENT, Location }        from '@angular/common';
import { LocalStorageService }       from 'ngx-store';
import { Router } from '@angular/router';

import { NxConfigService }           from './nx-config';
import { NxCloudApiService }         from './nx-cloud-api';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxDialogsService }          from '../dialogs/dialogs.service';
import { NxSessionService }          from './session.service';

import { distinctUntilChanged } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class NxAccountService {
    CONFIG: any;
    LANG: any;
    location: any;
    requestingLogin: any;

    constructor(@Inject(DOCUMENT) private document: any,
                private config: NxConfigService,
                private language: NxLanguageProviderService,
                private cloudApi: NxCloudApiService,
                private sessionService: NxSessionService,
                private localStorageService: LocalStorageService,
                private locationService: Location,
                private dialogs: NxDialogsService,
                private router: Router,
    ) {
        this.location = this.locationService;
        this.CONFIG = this.config.getConfig();
        this.LANG = this.language.getTranslations();

        // Distinct until changed is used to prevent the logout function from looping.
        this.sessionService.loginStateSubject.pipe(distinctUntilChanged()).subscribe((loginState) => {
            if (loginState === null) {
                this.logout();
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
                if (!account) {
                    return this.dialogs
                        .login(this, true, true)
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

    logout(doNotRedirect?) {
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

    logoutAuthorised() {
        this.get().then((account) => {
            // logoutAuthorisedLogoutButton
            if (account) {
                const continueAs = this.LANG.dialogs.continueAs.replace('{email}', account.email);
                this.dialogs.confirm('',
                        this.LANG.dialogs.logoutAuthorisedTitle,
                        continueAs,
                        undefined,
                        this.LANG.dialogs.createNewAccount,
                        true
                ).then((result) => {
                    if (result === this.LANG.dialogs.logoutAuthorisedLogoutButton) {
                        this.logout(true);
                    } else {
                        this.redirectAuthorised();
                    }
                });
            }
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
