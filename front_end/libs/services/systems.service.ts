import { Inject, Injectable, LOCALE_ID, OnDestroy } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { isEqual } from 'lodash-es';
import { of, ReplaySubject, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { NxSessionService } from '@services/session.service';
import { alphabeticalSort, paramSortFunc } from '@utils/general';

// import * as SystemsActions from '../store/systems/systems.actions';

import { NxCloudApiService } from './nx-cloud-api';
import type { System } from './nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxPollService } from './poll.service';
import { NxStorageService } from './storage.service';
import type { NxSystem } from './system.service/system';
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
export class NxSystemsService implements OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    private activeSubscription: Subscription;
    private currentUser: string;
    mergingSystems = new Set<string>();
    systems: NxSystemInfo[];
    systemsPoll: Observable<System[]>;
    systemsSubject = new ReplaySubject<NxSystemInfo[]>(0);
    finishedMerged: boolean = false;
    systemsMerging: MergeInfo = {
        primary: undefined,
        secondary: undefined
    };
    systemsInPool: number;

    private _userDisconnectSystem: boolean = false;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        pollService: NxPollService,
        // private http: HttpClient,
        private storageService: NxStorageService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        private uriService: NxUriService,
        private sessionService: NxSessionService,
        private cloudApi: NxCloudApiService,
        // private store: Store,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
        // this.registerStoreConnection();
        if (!environment.isLocal) {
            this.systemsPoll = pollService.createPoll(() => this._getSystems(), this.CONFIG.updateInterval);
        } else {
            this.systemsSubject.next([]);
        }

        languageService.translateSubject
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.LANG = languageService.translations;
            });
    }

    get userDisconnectSystem(): boolean {
        return this._userDisconnectSystem;
    }

    set userDisconnectSystem(value: boolean) {
        this._userDisconnectSystem = value;
    }

    // private registerStoreConnection(): void {
    //     this.systemsSubject.subscribe(systems => {
    //         this.store.dispatch(SystemsActions.set({ systems }));
    //     });
    // }

    get isPolling(): boolean {
        return this.systemsInPool > 0;
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
                ? this.LANG.dialogs.merge.mergeSuccess({
                    primaryName, secondaryName
                })
                : this.LANG.toastMessage.system.merge.success();
            this.systemsMerging = {
                primary: undefined,
                secondary: undefined
            };
            this.toastService.notify(message, this.CONFIG.toast.success);
            this.finishedMerged = true;
        }
    }

    private _getSystems(systemId?: string): Observable<System[]> {
        return this.cloudApi.systems(systemId);
    }

    forceUpdateSystems(userEmail?: string): Observable<NxSystemInfo[]> {
        if (userEmail) {
            this.currentUser = userEmail;
        }

        if (environment.isLocal) {
            this.systemsSubject.next([]);
            return of([]);
        }

        return this._getSystems().pipe(
            map(systems => {
                this.processSystems(systems);
                this.systemsSubject.next(this.systems);
                return this.systems;
            })
        );
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
            return this.LANG.system.yourSystem();
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
        return this.getSystem(systemId, useCache).toPromise();
    }

    getSystems(userEmail: string): void {
        this.currentUser = userEmail;
        if (this.activeSubscription) {
            this.activeSubscription.unsubscribe();
        }
        this.activeSubscription = this.systemsPoll
            .pipe(
                tap(systems => {
                    this.systemsInPool = systems.length;
                    this.processSystems(systems);
                }),
                distinctUntilChanged((a, b) => isEqual(a, b)),
                untilDestroyed(this)
            )
            .subscribe((): void => {
                this.sessionService.systems = this.systems;
                this.systemsSubject.next(this.systems);
            });
    }

    stopPoll(): void {
        if (this.activeSubscription) {
            this.activeSubscription.unsubscribe();
        }
    }

    ngOnDestroy(): void {
        if (this.activeSubscription) {
            this.stopPoll();
        }
    }

    private processSystems(systems: System[]): void {
        const sortedSystems = this.sortSystems(systems, this.currentUser);
        this.systems = sortedSystems.map(system => {
            const isMine = system.ownerAccountEmail === this.currentUser;
            const canMerge = !!(
                isMine && (
                    system.capabilities.cloudMerge ||
                    this.CONFIG.clientMode.debug ||
                    this.CONFIG.clientMode.beta
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
