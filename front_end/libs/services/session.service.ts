import { Injectable, inject, signal, computed } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { filter } from 'rxjs/operators';

import { environment } from '@environments/environment';

import { NxConfigService } from './nx-config/nx-config.service';
import { LOGIN_STATE } from './session.service.types';
import { NxSwCacheService } from './sw-cache.service';

@Injectable({
    providedIn: 'root',
})
export class NxSessionService {
    readonly LOGIN_STATE = LOGIN_STATE;
    readonly cloudUserCaches = ['apiFresh', 'cloudSystemAPI'];
    private session: LocalStorageService = inject(LocalStorageService);

    private state$$ = signal<LOGIN_STATE>(LOGIN_STATE.UNAUTHORIZED);

    public isUnauthorized$$ = computed(() => this.state$$() === LOGIN_STATE.UNAUTHORIZED);
    public isAuthorized$$ = computed(() => this.state$$() === LOGIN_STATE.AUTHORIZED);
    public changed$$ = computed(() => this.state$$() === LOGIN_STATE.CHANGED);

    constructor(public nxCache: NxSwCacheService) {
        let prevState = this.session.retrieve('loginState') || LOGIN_STATE.UNAUTHORIZED;
        this.state$$.set(prevState);

        if (prevState === LOGIN_STATE.UNAUTHORIZED) {
            // Session doesn't get cleared until closed. Clear it now to prevent leaking access tokens.
            sessionStorage.clear();
        }

        // Listens to changes from other browser tabs.
        this.session
            .observe('loginState')
            .pipe(
                filter((nextState: LOGIN_STATE) => {
                    if (nextState === prevState) {
                        return false;
                    } else if (nextState === LOGIN_STATE.CHANGED) {
                        prevState = nextState;
                        return false;
                    }
                    return true;
                }),
            )
            .subscribe((state: LOGIN_STATE) => {
                prevState = state;
                // Clear config overrides between sessions
                this.session.store(NxConfigService.OVERRIDE_KEY, {});

                if (!window.document.hasFocus() && !environment.testing) {
                    if (state === LOGIN_STATE.LOGGED_OUT) {
                        window.location.href = window.location.host;
                    } else {
                        window.location.reload();
                    }
                }
            });
    }

    invalidateSession(): void {
        this.loginState = this.LOGIN_STATE.UNAUTHORIZED;
        this.session.store('loginRegister', false);
        // Session doesn't get cleared until closed. Clear it now to prevent leaking access tokens.
        sessionStorage.clear();
        this.cloudUserCaches.forEach(cacheName => {
            this.nxCache.clearByName(cacheName).catch(error => console.error(error));
        });
    }

    get loginState(): LOGIN_STATE {
        return this.session.retrieve('loginState');
    }

    set loginState(state: LOGIN_STATE) {
        this.session.store('loginState', state);
        this.state$$.set(state);
    }
}
