import { Inject, Injectable, Injector, LOCALE_ID } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash-es';
import {
    of,
    Observable,
    timer,
    firstValueFrom,
    combineLatest,
    identity,
    Subject,
    merge,
    filter,
    withLatestFrom,
} from 'rxjs';
import { distinctUntilChanged, first, map, shareReplay, switchMap } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { MergeInfo } from '@dialogs/merge/merge.refactor.component.types';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { nxConfig } from '@services/nx-config/config';
import { alphabeticalSort, paramSortFunc } from '@utils/general';
import { memoizeAsyncPersistent } from '@utils/memoize';

// import * as SystemsActions from '../store/systems/systems.actions';

import { clientMode, toast, updateInterval } from '../variables/static-variables';

import type { Account } from './account.service/account';
import { NxDbService } from './db.service';
import { NxCloudApiService } from './nx-cloud-api';
import type { System } from './nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxStorageService } from './storage.service';
import type { NxSystem } from './system.service/system';
import { NxSystemService } from './system.service/system.service';
import type { NxSystemInfo } from './systems.service.types';
import { NxUriService } from './uri.service';

@UntilDestroy()
@Injectable({
    providedIn: 'root',
})
export class NxSystemsService {
    CONFIG: IConfig;
    LANG = staticLang;
    private currentUser$ = this.store.select(selectCurrentUser).pipe(
        // Ignore preloaded account on cloud
        // Also ignore first assignment missing security properties
        filter(
            acc => acc && (environment.isLocal || ('email' in acc && 'account2faEnabled' in acc)),
        ),
        distinctUntilChanged<Account>(isEqual),
    );
    private updateSystems$ = new Subject<void>();
    mergingSystems = new Set<string>();
    systemsPoll: Observable<System[]>;
    systemsSubject = merge(this.currentUser$, this.updateSystems$).pipe(
        withLatestFrom(this.currentUser$),
        filter(([_, account]) => environment.isLocal || !!account),
        // Ignore manual update signal if account has not been assigned
        switchMap(() => (environment.isLocal ? Promise.resolve([]) : this._getSystems())),
        map(systems => this.processSystems(systems)),
        !nxConfig.featureFlags.requestCaching || environment.isLocal
            ? identity
            : switchMap(systems => {
                this.db.personal.systems.clear();
                this.db.personal.systems.bulkPut(systems);
                return this.db.personal.systems.$.toArray();
            }),
        shareReplay({ bufferSize: 1, refCount: false }),
    );
    finishedMerged: boolean = false;
    systemsMerging: Pick<MergeInfo, 'primary' | 'secondary'> = {
        primary: undefined,
        secondary: undefined,
    };
    systemsInPool: number;

    private _userDisconnectSystem: boolean = false;
    private userEmail: string;

    #systems: NxSystemInfo[] = [];

    get systems(): NxSystemInfo[] {
        return this.#systems;
    }

    constructor(
        configService: NxConfigService,
        private storageService: NxStorageService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        private uriService: NxUriService,
        private cloudApi: NxCloudApiService,
        private injector: Injector,
        private store: Store,
        private db: NxDbService,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.CONFIG = configService.getConfig();
        this.systemsSubject.subscribe(systems => {
            this.#systems = systems;
        });

        // Singleton service
        // eslint-disable-next-line ngrx/no-store-subscription
        this.store.select(selectCurrentUser).subscribe(user => {
            this.userEmail = user?.email;
        });

        this.populateSystems();
    }

    @memoizeAsyncPersistent
    private populateSystems(): void {
        if (environment.isLocal) {
            return;
        }
        this.systemsSubject.pipe(first(systems => systems.length > 0)).subscribe(systems => {
            const systemService = this.injector.get(NxSystemService);
            for (const { stateOfHealth, id, system2faEnabled } of systems) {
                if (stateOfHealth === 'online' && !system2faEnabled) {
                    systemService.createSystem(
                        this.userEmail,
                        id,
                        null,
                        true,
                        true,
                    );
                }
            }
        });
    }

    get userDisconnectSystem(): boolean {
        return this._userDisconnectSystem;
    }

    set userDisconnectSystem(value: boolean) {
        this._userDisconnectSystem = value;
    }

    processMerge(mergeInfo: MergeInfo): void {
        this.systemsMerging.primary = mergeInfo.primary;
        this.systemsMerging.secondary = mergeInfo.secondary;
    }

    addToMergeList(systemId: string): void {
        this.mergingSystems.add(systemId);
    }

    private removeFromMergeList(systemId: string): void {
        if (this.mergingSystems.has(systemId)) {
            this.mergingSystems.delete(systemId);
            const primaryName = this.systemsMerging.primary.name;
            const secondaryName = this.systemsMerging.secondary.name;
            const message =
                primaryName && secondaryName
                    ? {
                        value: this.LANG.dialogs.merge.mergeSuccess,
                        params: {
                            primaryName,
                            secondaryName,
                        },
                    }
                    : this.LANG.toastMessage.system.merge.success;
            this.systemsMerging = {
                primary: undefined,
                secondary: undefined,
            };
            this.toastService.notify(message, toast.success);
            this.finishedMerged = true;
        }
    }
    // Dropped the decorator because it caused a memory leak.
    private _getSystems(systemId?: string): Observable<System[]> {
        return combineLatest([timer(0, updateInterval), this.currentUser$]).pipe(
            switchMap(() => {
                // console.log(systemId);
                return this.cloudApi.systems(systemId);
            }),
        );
    }

    forceUpdateSystems(): Observable<NxSystemInfo[]> {
        if (environment.isLocal) {
            return of([]);
        }

        this.updateSystems$.next();

        return this.systemsSubject;
    }

    forceUpdateSystemsAsPromise(): Promise<NxSystemInfo[]> {
        return this.forceUpdateSystems().toPromise();
    }

    getSystemOwnerName(
        system: Pick<System, 'name' | 'ownerAccountEmail' | 'ownerFullName'>,
    ): string {
        if (system.ownerAccountEmail === this.userEmail) {
            return this.LANG.system.yourSystem;
        }
        if (system.ownerFullName && system.ownerFullName.trim() !== '') {
            return system.ownerFullName;
        }
        return system.ownerAccountEmail;
    }

    getSystem(
        systemId: string,
        useCache: boolean = true,
    ): Observable<NxSystemInfo | System | undefined> {
        let system: NxSystemInfo;
        if (this.systems && this.systems.length > 0) {
            system = this.systems.find(system => system.id === systemId);
        }

        if (system && useCache) {
            // Cache success
            return of(system);
        } else {
            // Cache miss
            return this._getSystems(systemId).pipe(map(systems => systems[0]));
        }
    }

    getSystemAsPromise(
        systemId: string,
        useCache: boolean = true,
    ): Promise<NxSystemInfo | System | undefined> {
        return firstValueFrom(this.getSystem(systemId, useCache));
    }

    private processSystems(systems: System[]): NxSystemInfo[] {
        const sortedSystems = this.sortSystems(systems);
        return sortedSystems.map(system => {
            const isMine = system.ownerAccountEmail === this.userEmail;
            const canMerge = !!(
                isMine &&
                (system.capabilities.cloudMerge || clientMode.debug || clientMode.beta)
            );
            const versionMatch = system.version.match(/(\d*\.\d*)\.\d*\.\d*/);
            const version = parseFloat(versionMatch?.[1] ?? '0');
            const useRest = Math.floor(version) > 4;

            const systemInfo = {
                ...system,
                isMine,
                canMerge,
                version,
                useRest,
            };

            this.checkMerge(systemInfo);

            return systemInfo;
        });
    }

    checkMerge(system: NxSystem | NxSystemInfo): boolean {
        if ((system as NxSystem).mergeInfo !== undefined) {
            this.addToMergeList(system.id);
        } else if (this.mergingSystems.has(system.id)) {
            const currentSystemId = this.storageService.systemId;
            if (
                this.systemsMerging.secondary &&
                currentSystemId === this.systemsMerging.secondary.id
            ) {
                this.uriService.updateURI(`/systems/${this.systemsMerging.primary.id}`, {});
            }
            if (this.systemsMerging.primary && currentSystemId === this.systemsMerging.primary.id) {
                this.ribbonService.hide();
            }
            this.removeFromMergeList(system.id);
            return false;
        }
        return true;
    }

    private sortSystems(systems: System[]): System[] {
        // Priority: name => status
        // Note: JS sort has been stable since ECMAScript 2019
        return systems
            .sort(alphabeticalSort(this.locale, sys => sys.name))
            .sort(paramSortFunc(sys => Number(sys.stateOfHealth !== 'online')));
    }
}
