import { Inject, Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

import { NxSystemInfo } from '@services/systems.service.types';

import { NxConfigService } from './nx-config/nx-config.service';
import { NxSwCacheService } from './sw-cache.service';
import { WINDOW } from './window-provider';

@Injectable({
    providedIn: 'root'
})
export class NxSessionService {
    readonly cloudUserCaches = ['apiFresh', 'cloudSystemAPI'];
    email$: BehaviorSubject<string>;
    loginStateSubject: BehaviorSubject<string>;
    language$: BehaviorSubject<string>;
    langChanged$: BehaviorSubject<boolean>;
    private session: LocalStorageService;

    constructor(
        private localStorageService: LocalStorageService,
        private nxCache: NxSwCacheService,
        @Inject(WINDOW) private window: Window
    ) {
        this.session = this.localStorageService;

        this.email$ = new BehaviorSubject<string>(this.session.retrieve('email'));
        this.loginStateSubject = new BehaviorSubject<string>(this.loginState || '');
        this.language$ = new BehaviorSubject<string>(this.session.retrieve('language'));
        this.language$ = new BehaviorSubject<string>(this.session.retrieve('language'));

        let hasSkippedFirstNull = !!this.session.retrieve('loginState');
        // Listens to changes from other browser tabs.
        this.session.observe('loginState').pipe(
            filter(val => {
                if (!val && !hasSkippedFirstNull) {
                    hasSkippedFirstNull = true;
                    return false;
                }
                return true;
            })
        ).subscribe(() => {
            hasSkippedFirstNull = true;
            // Clear config overrides between sessions
            this.session.store(NxConfigService.OVERRIDE_KEY, {});

            if (!this.window.document.hasFocus()) {
                // Don't reload on null since that state should show a session expired dialog
                this.window.location.reload();
            }
        });
    }

    get systems(): NxSystemInfo[] {
        return this.session.retrieve('systems');
    }

    set systems(systems: NxSystemInfo[]) {
        this.session.store('systems', systems);
    }

    get systemId(): string {
        return this.session.retrieve('systemId');
    }

    set systemId(systemId: string) {
        this.session.store('systemId', systemId);
    }

    invalidateSession(): void {
        this.loginState = null;
        this.session.store('loginRegister', false);
        this.cloudUserCaches.forEach(cacheName => {
            this.nxCache.clearByName(cacheName).catch(error => console.error(error));
        });
    }

    get email(): string | undefined {
        return this.email$?.getValue();
    }

    set email(email: string) {
        this.session.store('email', email);
        this.email$.next(email);
    }

    get language(): string | undefined {
        return this.language$?.getValue();
    }

    set language(lang: string) {
        this.session.store('language', lang);
        this.language$.next(lang);
    }

    get langChanged(): boolean | undefined {
        return this.langChanged$?.getValue();
    }

    set langChanged(bool: boolean) {
        this.session.store('langChanged', bool);
        this.langChanged$.next(bool);
    }

    get loginState(): string {
        return this.session.retrieve('loginState');
    }

    set loginState(email: string) {
        this.session.store('loginState', email);
        this.loginStateSubject.next(email);
    }
}
