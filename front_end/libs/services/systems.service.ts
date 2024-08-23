import { Injectable, computed, Injector } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash-es';
import {
    of,
    Observable,
    timer,
    firstValueFrom,
    combineLatest,
    Subject,
    merge,
    filter,
    withLatestFrom,
} from 'rxjs';
import { distinctUntilChanged, map, shareReplay, startWith, switchMap } from 'rxjs/operators';

import { selectCurrentUser } from '@common/store/account/account.selectors';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { ToastType } from '@components/toast-container/toast.types';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import type { Organization } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { NxSystemService } from '@services/system.service/system.service';
import { NxToastService } from '@services/toast.service';
import { selectRootOrganizations } from '@store/channel-partners/channel-partners.selectors';
import { alphabeticalSort, paramSortFunc } from '@utils/general';
import { isOrgSystem, isSystemMerging, isUserSystem } from '@utils/nx';

import { updateInterval } from '../variables/static-variables';

import type { Account } from './account.service/account';
import { NxCloudApiService } from './nx-cloud-api';
import type { System } from './nx-cloud-api/nx-cloud-api.types';
import { NxStorageService } from './storage.service';
import type { MergeInfo } from './system-api.types/system.types';
import type { NxSystem } from './system.service/system';
import type { NxSystemInfo, NxUserSystemInfo } from './systems.service.types';
import { NxUriService } from './uri.service';

@UntilDestroy()
@Injectable({
    providedIn: 'root',
})
export class NxSystemsService {
    LANG = staticLang;
    private currentUser$ = this.store.select(selectCurrentUser).pipe(
        // Ignore preloaded account on cloud
        // Also ignore first assignment missing security properties
        filter(
            acc => acc && (environment.isLocal || ('email' in acc && 'account2faEnabled' in acc)),
        ),
        distinctUntilChanged<Account>(isEqual),
    );
    private updateSystems$ = new Subject<void | NxSystemInfo[]>();
    mergingSystems = new Set<string>();
    systemsSubject = merge(this.currentUser$, this.updateSystems$).pipe(
        withLatestFrom(this.currentUser$),
        filter(([_, email]) => environment.isLocal || !!email),
        // Ignore manual update signal if email has not been assigned
        switchMap(([systems]) => {
            if (environment.isLocal) {
                return Promise.resolve([] as NxSystemInfo[]);
            }
            return Array.isArray(systems)
                ? this._getSystems(undefined, 15_000).pipe(
                      map(systems => this.processSystems(systems)),
                      startWith(systems),
                  )
                : this._getSystems().pipe(map(systems => this.processSystems(systems)));
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    deleteSystem = (systemId: string): void =>
        this.updateSystems$.next(this.systems$$().filter(system => system.id !== systemId));

    systems$$ = toSignal(this.systemsSubject, { initialValue: [] });
    systemsPermissionsManager$$ = computed(() => {
        const systemService = this.injector.get(NxSystemService);

        return this.systems$$()?.reduce(
            (map, systemInfo) => ({
                ...map,
                [systemInfo.id]: systemService.createSystemById(systemInfo.id).permissionManager,
            }),
            {},
        );
    });
    systemInfoMap$$ = computed<Map<string, NxSystemInfo>>(() => {
        const systems = this.systems$$();
        return new Map(systems.map(s => [s.id, s]));
    });
    organizations$ = this.store.select<Organization[]>(selectRootOrganizations);

    directAccessSystems$ = combineLatest([this.organizations$, this.systemsSubject]).pipe(
        map(([organizations, systems]) => {
            const orgIds: Set<string> = new Set(organizations.map(({ id }) => id));
            return systems.filter(
                system => isUserSystem(system) || !orgIds.has(system.organizationId),
            );
        }),
        startWith([]),
        shareReplay({ bufferSize: 1, refCount: false }),
    );
    directAccessSystems$$ = toSignal(this.directAccessSystems$, { initialValue: [] });

    finishedMerged: boolean = false;
    systemsMerging: Pick<MergeInfo, 'primary' | 'secondary'> = {
        primary: undefined,
        secondary: undefined,
    };
    systemsInPool: number;

    private _userDisconnectSystem: boolean = false;
    public userEmail: string;

    #systems: NxSystemInfo[] = [];

    get systems(): NxSystemInfo[] {
        return this.#systems;
    }

    constructor(
        private storageService: NxStorageService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        private uriService: NxUriService,
        private cloudApi: NxCloudApiService,
        private store: Store,
        protected injector: Injector,
    ) {
        this.systemsSubject.pipe(takeUntilDestroyed()).subscribe(systems => {
            this.#systems = systems;
        });

        // Singleton service
        this.store
            .select(selectCurrentUser)
            .pipe(takeUntilDestroyed())
            .subscribe(user => {
                this.userEmail = user?.email;
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
            this.toastService.notify(message, ToastType.Success);
            this.finishedMerged = true;
        }
    }
    // Dropped the decorator because it caused a memory leak.
    private _getSystems(systemId?: string, initialDelay = 0): Observable<System[]> {
        return combineLatest([timer(initialDelay, updateInterval), this.currentUser$]).pipe(
            switchMap(() => this.cloudApi.systems(systemId)),
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
        return firstValueFrom(this.forceUpdateSystems());
    }

    getSystemOwnerName(system: System | NxSystemInfo): string {
        if ('organizationId' in system) {
            return '';
            // Old systems list will not be used with org systems in prod
        }
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
        return sortedSystems.map<NxSystemInfo>(system => {
            const versionMatch = system.version.match(/(\d*\.\d*)\.\d*\.\d*/);
            const version = parseFloat(versionMatch?.[1] ?? '0');
            const useRest = Math.floor(version) > 4;

            if (isUserSystem(system)) {
                const isMine = system.ownerAccountEmail === this.userEmail;
                const systemInfo = {
                    ...system,
                    isMine,
                    canMerge: isMine,
                    version,
                    useRest,
                };

                this.checkMerge(systemInfo);

                return systemInfo;
            } else {
                return {
                    ...system,
                    isMine: false,
                    canMerge: false,
                    version,
                    useRest,
                };
            }
        });
    }

    checkMerge(system: NxSystem | NxUserSystemInfo): boolean {
        if (isSystemMerging(system as NxSystem)) {
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
            .sort(alphabeticalSort(sys => sys.name))
            .sort(paramSortFunc(sys => Number(sys.stateOfHealth !== 'online')));
    }

    public isSaasSystem(systemId: string): boolean {
        const system = this.systems$$().find(({ id }) => id === systemId);
        return !!system && isOrgSystem(system);
    }
}
