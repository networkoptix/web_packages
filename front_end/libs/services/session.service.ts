import { Injectable, inject } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { NxSystemInfo } from '@services/systems.service.types';

import { NxDbService } from './db.service';
import { NxConfigService } from './nx-config/nx-config.service';
import type { LoginParams } from './session.service.types';
import { NxSwCacheService } from './sw-cache.service';

@Injectable({
    providedIn: 'root',
})
export class NxSessionService {
    readonly cloudUserCaches = ['apiFresh', 'cloudSystemAPI'];
    private session: LocalStorageService = inject(LocalStorageService);
    loginStateSubject: BehaviorSubject<string> = new BehaviorSubject(this.loginState || '');
    loginParams$: BehaviorSubject<LoginParams>;
    language$: BehaviorSubject<string>;
    langChanged$: BehaviorSubject<boolean>;

    constructor(
        public nxCache: NxSwCacheService,
        private db: NxDbService,
    ) {
        this.loginParams$ = new BehaviorSubject(
            this.loginParams ?? {
                code: null,
                auth: null,
                refreshToken: null,
            },
        );
        this.language$ = new BehaviorSubject(this.session.retrieve('language'));

        let hasSkippedFirstNull = !!this.session.retrieve('loginState');

        if (!hasSkippedFirstNull) {
            // Session doesn't get cleared until closed. Clear it now to prevent leaking access tokens.
            sessionStorage.clear();
        }

        // Listens to changes from other browser tabs.
        this.session
            .observe('loginState')
            .pipe(
                filter(val => {
                    if (!val && !hasSkippedFirstNull) {
                        hasSkippedFirstNull = true;
                        return false;
                    }
                    return true;
                }),
            )
            .subscribe(() => {
                hasSkippedFirstNull = true;
                // Clear config overrides between sessions
                this.session.store(NxConfigService.OVERRIDE_KEY, {});

                if (!document.hasFocus() && !environment.testing) {
                    // Don't reload on null since that state should show a session expired dialog
                    window.location.reload();
                }
            });
    }

    get systems$(): Observable<NxSystemInfo[]> {
        return this.db.personal.systems.$.toArray();
    }

    get systems(): NxSystemInfo[] {
        return this.session.retrieve('systems');
    }

    set systems(systems: NxSystemInfo[]) {
        this.db.personal.systems.bulkPut(systems);
        this.session.store('systems', systems);
    }

    get hslTheme(): Record<string, Record<string, string>[] | number> {
        return this.session.retrieve('theme-hsl') || {};
    }

    set hslTheme(themeHsl: Record<string, Record<string, string>[] | number>) {
        this.session.store('theme-hsl', themeHsl);
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
        // Session doesn't get cleared until closed. Clear it now to prevent leaking access tokens.
        sessionStorage.clear();
        this.cloudUserCaches.forEach(cacheName => {
            this.nxCache.clearByName(cacheName).catch(error => console.error(error));
        });
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

    get loginParams(): LoginParams {
        return this.session.retrieve('loginParams');
    }

    set loginParams(newParams: LoginParams) {
        const params = {
            ...this.loginParams,
            ...Object.fromEntries<string>(
                Object.entries(newParams).filter(([_k, v]) => v !== null),
            ),
        };
        this.session.store('loginParams', params);
        this.loginParams$.next(params);
    }

    // Setter ignores nulls
    clearLoginParams(): void {
        const cleared = { code: null, auth: null, refreshToken: null };
        this.session.store('loginParams', cleared);
        this.loginParams$.next(cleared);
    }
}
