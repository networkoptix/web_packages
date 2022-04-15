import { Inject, Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { ReplaySubject } from 'rxjs';

import { NxSwCacheService } from './sw-cache.service';
import { WINDOW } from './window-provider';

@Injectable({
    providedIn: 'root'
})
export class NxSessionService {
    readonly cloudUserCaches = ['apiFresh', 'cloudSystemAPI'];
    loginStateSubject = new ReplaySubject<string>(0);
    language$ = new ReplaySubject<string>(0);
    private session: LocalStorageService;

    constructor(
        private localStorageService: LocalStorageService,
        private nxCache: NxSwCacheService,
        @Inject(WINDOW) private window: Window
    ) {
        this.session = this.localStorageService;
        this.loginStateSubject.next(this.loginState || '');
        // Listens to changes from other browser tabs.
        this.session.observe('loginState').subscribe(_ => {
            if (!this.window.document.hasFocus()) {
                this.window.location.reload();
            }
        });
    }

    invalidateSession(): void {
        this.session.store('loginState', null);
        this.session.store('loginRegister', false);
        this.loginStateSubject.next(this.loginState);
        this.cloudUserCaches.forEach(cacheName => {
            this.nxCache.clearByName(cacheName).catch(error => console.error(error));
        });
    }

    get email() {
        return this.session.retrieve('email') || '';
    }

    set email(email: string) {
        this.session.store('email', email);
    }

    get language() {
        return this.session.retrieve('language');
    }

    set language(lang: string) {
        this.session.store('language', lang);
        this.language$.next(lang);
    }

    get loginState() {
        return this.session.retrieve('loginState');
    }

    set loginState(email: string) {
        this.session.store('loginState', email);
        this.loginStateSubject.next(email);
    }
}
