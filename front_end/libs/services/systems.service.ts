import { Inject, Injectable, Injector, LOCALE_ID } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import {
    of,
    Observable,
    BehaviorSubject,
    timer,
    firstValueFrom,
    combineLatest,
    identity,
} from 'rxjs';
import { first, map, shareReplay, switchMap } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { nxConfig } from '@services/nx-config/config';
import { alphabeticalSort, paramSortFunc } from '@utils/general';
import { memoizeAsyncPersistent } from '@utils/memoize';

// import * as SystemsActions from '../store/systems/systems.actions';

import { clientMode, toast, updateInterval } from '../variables/static-variables';

import { NxDbService } from './db.service';
import { NxCloudApiService } from './nx-cloud-api';
import type { System } from './nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxPollService } from './poll.service';
import { NxStorageService } from './storage.service';
import type { NxSystem } from './system.service/system';
import { NxSystemService } from './system.service/system.service';
import type { NxSystemInfo } from './systems.service.types';
import { NxUriService } from './uri.service';

// Only these two are needed inside the service
interface MergeInfo {
    primary: NxSystemInfo;
    secondary: NxSystemInfo;
}

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class NxSystemsService {
    CONFIG: IConfig;
    LANG = staticLang;
    currentUser$ = new BehaviorSubject('');
    mergingSystems = new Set<string>();
    systemsPoll: Observable<System[]>;
    systemsSubject = this.currentUser$.pipe(
        switchMap(() => environment.isLocal ? Promise.resolve([]) : this._getSystems()),
        map(systems => this.processSystems(systems)),
        !nxConfig.featureFlags.requestCaching || environment.isLocal ? identity : switchMap(systems => {
            this.db.personal.systems.clear();
            this.db.personal.systems.bulkPut(systems);
            return this.db.personal.systems.$.toArray();
        }),
        shareReplay({ bufferSize: 1, refCount: false })
    );
    finishedMerged: boolean = false;
    systemsMerging: MergeInfo = {
        primary: undefined,
        secondary: undefined
    };
    systemsInPool: number;

    private _userDisconnectSystem: boolean = false;

    private set currentUser(value: string) {
        this.currentUser$.next(value);
    }

    private get currentUser(): string {
        return this.currentUser$.value;
    }

    #systems: NxSystemInfo[] = [];

    get systems(): NxSystemInfo[] {
        return this.#systems;
    }

    constructor(
        configService: NxConfigService,
        pollService: NxPollService,
        // private http: HttpClient,
        private storageService: NxStorageService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        private uriService: NxUriService,
        private cloudApi: NxCloudApiService,
        private injector: Injector,
        // private store: Store,
        private db: NxDbService,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.CONFIG = configService.getConfig();
        this.systemsSubject.subscribe(systems => {
            this.#systems = systems;
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
            for (const { stateOfHealth, id } of systems) {
                if (stateOfHealth === 'online') {
                    const system = systemService.createSystem(this.currentUser, id);
                    try {
                        (async () => {
                            await system.update();

                            // Prefetch initial data
                            await firstValueFrom(system.updateOrGetSystemSettings());
                            await firstValueFrom(system.getAggregateLicenseInfo());
                        })();
                    } catch (error) {
                        console.error(error);
                    }
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
            const message = (primaryName && secondaryName)
                ? {
                    value: this.LANG.dialogs.merge.mergeSuccess,
                    params: {
                        primaryName, secondaryName
                    }
                }
                : this.LANG.toastMessage.system.merge.success;
            this.systemsMerging = {
                primary: undefined,
                secondary: undefined
            };
            this.toastService.notify(message, toast.success);
            this.finishedMerged = true;
        }
    }

    @memoizeAsyncPersistent
    private _getSystems(systemId?: string): Observable<System[]> {
        return combineLatest([timer(0, updateInterval), this.currentUser$]).pipe(switchMap(() => {
            // console.log(systemId);
            return this.cloudApi.systems(systemId);
        }));
    }

    forceUpdateSystems(userEmail?: string): Observable<NxSystemInfo[]> {
        if (environment.isLocal) {
            return of([]);
        }

        this.currentUser$.next(userEmail || this.currentUser);

        return this.systemsSubject;
    }

    forceUpdateSystemsAsPromise(userEmail?: string): Promise<NxSystemInfo[]> {
        return this.forceUpdateSystems(userEmail).toPromise();
    }

    canViewInfo(userRole: string): boolean {
        return this.CONFIG.accessRoles.adminAccess.includes(userRole.toLowerCase());
    }

    getSystemOwnerName(
        system: Pick<System, 'name' | 'ownerAccountEmail' | 'ownerFullName'>,
        currentUserEmail: string,
        forOrder?: boolean
    ): string {
        if (system.ownerAccountEmail === currentUserEmail) {
            if (forOrder) {
                return `!!!!!!!${system.name}`; // Force my systems to be first
            }
            return this.LANG.system.yourSystem;
        }
        if (system.ownerFullName && system.ownerFullName.trim() !== '') {
            return system.ownerFullName;
        }
        return system.ownerAccountEmail;
    }

    getMySystems(currentUserEmail: string, currentSystemId: string): NxSystemInfo[] {
        return this.systems.filter(system =>
            system.ownerAccountEmail === currentUserEmail &&
            system.id !== currentSystemId
        ).sort(alphabeticalSort(this.locale, sys => sys.name));
    }

    getSystem(
        systemId: string,
        useCache: boolean = true,
    ): Observable<NxSystemInfo | System | undefined> {
        let system: NxSystemInfo;
        if (this.systems && this.systems.length > 0) {
            system = this.systems.find(system => system.id === systemId);
        }

        if (system && useCache) { // Cache success
            return of(system);
        } else { // Cache miss
            return this._getSystems(systemId).pipe(map(systems => systems[0]));
        }
    }

    getSystemAsPromise(
        systemId: string,
        useCache: boolean = true
    ): Promise<NxSystemInfo | System | undefined> {
        return firstValueFrom(this.getSystem(systemId, useCache));
    }

    getSystems(userEmail: string): void {
        if (this.currentUser === userEmail) {
            return;
        }

        this.currentUser = userEmail;
        firstValueFrom(this._getSystems());
    }

    private processSystems(systems: System[]): NxSystemInfo[] {
        const sortedSystems = this.sortSystems(systems, this.currentUser);
        return sortedSystems.map(system => {
            const isMine = system.ownerAccountEmail === this.currentUser;
            const canMerge = !!(
                isMine && (
                    system.capabilities.cloudMerge ||
                    clientMode.debug ||
                    clientMode.beta
                )
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
            if (this.systemsMerging.secondary && currentSystemId === this.systemsMerging.secondary.id) {
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

    private sortSystems(systems: System[], currentUserEmail: string): System[] {
        // Alphabet sorting
        const preSort = systems.sort(
            alphabeticalSort(this.locale, sys => this.getSystemOwnerName(sys, currentUserEmail, true))
        );
        // Sort by usage frequency is more important than Alphabet
        return preSort.sort(paramSortFunc(sys => sys.usageFrequency, false));
    }
}
