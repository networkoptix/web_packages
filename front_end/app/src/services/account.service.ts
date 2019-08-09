import { Inject, Injectable }        from '@angular/core';
import { DOCUMENT, Location }        from '@angular/common';
import { NxConfigService }           from './nx-config';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxDialogsService }          from '../dialogs/dialogs.service';
import { NxCloudApiService }         from './nx-cloud-api';
import { LocalStorageService }       from 'ngx-store';
import { BehaviorSubject }           from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxAccountService {
    CONFIG: any;
    LANG: any;

    session: any;
    location: any;
    requestingLogin: any;
    loginStateSubject = new BehaviorSubject([]);

    constructor(@Inject(DOCUMENT) private document: any,
                private config: NxConfigService,
                private language: NxLanguageProviderService,
                // private dialogs: NxDialogsService,
                private cloudApi: NxCloudApiService,
                localStorageService: LocalStorageService,
                location: Location,
    ) {
        this.session = localStorageService;
        this.location = location;
        this.loginStateSubject.next(this.session.get('loginState'));
        this.CONFIG = this.config.getConfig();
        this.LANG = this.language.getTranslations();

        this.loginStateSubject.subscribe((loginState) => {
            // if (!$routeParams.next && this.session.get('loginState') !== loginState) {
            //     this.document.location.reload();
            // }
        });
    }

    clearLoginState() {
        this.session.set('loginState', undefined);
        this.loginStateSubject.next(undefined);
    }

    checkLoginState(): Promise<boolean> {
            return new Promise<boolean>((resolve, reject) => {
                if (this.loginStateSubject.getValue()) {
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
                       return result.data.auth_key;
                   });
    }

    checkVisitedKey(key) {
        return this.cloudApi
                   .visitedKey(key)
                   .then((result: any) => {
                       return result.data.visited;
                   });
    }

    checkCode(code) {
        return this.cloudApi
                   .checkCode(code)
                   .then((result: any) => {
                       return result.data.emailExists;
                   });
    }

    requireLogin() {
        const res = this.get();
        res.catch(() => {
            // this.dialogs
            //     .login(true, true)
            //     .catch(() => {
            //         this.location.path(this.CONFIG.redirectUnauthorised);
            //     });
        });
        return res;
    }

    redirectAuthorised() {
        this.get().then(() => {
            this.location.go(this.CONFIG.redirectAuthorised);
        });
    }

    redirectToHome() {
        this.get().then(() => {
            this.location.path(this.CONFIG.redirectAuthorised);
        }, () => {
            this.location.path(this.CONFIG.redirectUnauthorised);
        });
    }

    setEmail(email) {
        this.session.set('email', email);
    }

    getEmail() {
        return this.session.email;
    }

    login(email, password, remember): Promise<any> {
        this.setEmail(email);

        return this.cloudApi
                   .login(email, password, remember).toPromise()
                   .then((result) => {
                       if (this.cloudApi.checkResponseHasError(result)) {
                           return new Promise<any>((resolve, reject) => {
                               reject(result);
                           });
                       }

                       if (result.email) { // (result.data.resultCode === L.errorCodes.ok)
                           this.setEmail(result.email);
                           this.session.set('loginState', result.email); // Forcing changing loginState to reload interface
                           this.loginStateSubject.next(result.email);
                       }
                       return result;
                   });
    }

    logout(doNotRedirect) {
        this.cloudApi
            .logout()
            .finally(() => {
                this.session.clear('all'); // Clear session
                if (!doNotRedirect) {
                    this.location.path(this.CONFIG.redirectUnauthorised);
                }
                setTimeout(() => {
                    this.document.location.reload();
                });
            });
    }

    logoutAuthorised() {
        this.get().then(() => {
            // logoutAuthorisedLogoutButton
            // this.dialogs.confirm('',
            //         this.LANG.dialogs.logoutAuthorisedTitle,
            //         this.LANG.dialogs.logoutAuthorisedContinueButton,
            //         undefined,
            //         this.LANG.dialogs.logoutAuthorisedLogoutButton
            // ).then(() => {
            //     this.redirectAuthorised();
            // }, () => {
            //     this.logout(true);
            // });
        });
    }

    checkUnauthorized(data) {
        if (data && data.data && data.data.resultCode === 'notAuthorized') {
            this.logout(true);
            return false;
        }
        return true;
    }
}
