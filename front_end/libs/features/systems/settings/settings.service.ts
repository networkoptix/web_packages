/** This should be refactored to not be its own service */
import { Injectable, OnDestroy } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, map, Observable, shareReplay, switchMap } from 'rxjs';

import { SystemConfigSettings } from '@services/system-api.types';
import type { NxSystem } from '@services/system.service/system';

@Injectable({
    providedIn: 'root'
})
export class NxSettingsService implements OnDestroy {
    static currentSystemId = '';
    systemSubject$ = new BehaviorSubject<NxSystem>(undefined);
    menuVisible = false;

    get system(): NxSystem {
        return this.systemSubject$.value;
    }

    set system(system: NxSystem) {
        const updatedSystem = system && system.id !== this.system?.id;
        if (this.system && updatedSystem) {
            this.system?.stopPoll();
        }

        if (updatedSystem) {
            this.menuVisible = false;
            this.systemSubject$.next(system);
        }
    }

    updater$ = new BehaviorSubject('');

    getUpdatedSettings(): Observable<SystemConfigSettings> {
        this.updater$.next('update');
        return this.systemSettings$;
    }

    systemSettings$ = this.systemSubject$.pipe(
        filter(val => !!val),
        switchMap(system => this.updater$.pipe(map(() => system))),
        switchMap(system => system.mediaserver.updateOrGetSettings({})),
        map(res => res?.reply?.settings),
        filter(val => !!val),
        catchError(() => Promise.resolve(null)),
        // startWith(null),
        shareReplay({ bufferSize: 1, refCount: false })
    );

    ngOnDestroy(): void {
        this.systemSubject$.complete();
    }

    constructor(
        // private applyService: NxApplyService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(() => this.route.root.firstChild),
            switchMap(route => route.params),
            map(params => params.systemId),
            filter(systemId => systemId && systemId !== this.system?.id)
        ).subscribe(() => {
            this.system = undefined;
        });
    }
}
