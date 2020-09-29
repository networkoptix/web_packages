import { Inject, Injectable }  from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { ReplaySubject }       from 'rxjs';

import { WINDOW }              from './window-provider';

@Injectable({
    providedIn: 'root'
})
export class NxSessionService {
    loginStateSubject = new ReplaySubject<string>(0);
    private session: LocalStorageService;

    constructor(
        private localStorageService: LocalStorageService,
        @Inject(WINDOW) private window: Window
    ) {
        this.session = this.localStorageService;
        this.loginStateSubject.next(this.loginState || '');

        // Listens to changes from other browser tabs.
        this.window.addEventListener('storage', (event) => {
            if (event.key === 'ngx-webstorage|loginstate' && event.oldValue) {
                this.window.location.reload();
            }
        });
    }

    invalidateSession() {
        this.session.store('loginState', null);
        this.session.store('loginRegister', false);
        this.loginStateSubject.next(this.loginState);
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
    }

    get loginState() {
        return this.session.retrieve('loginState');
    }

    set loginState(email: string) {
        this.session.store('loginState', email);
        this.loginStateSubject.next(email);
    }
}
