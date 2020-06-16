import { Injectable, OnDestroy }                       from '@angular/core';
import { of, ReplaySubject, Observable, Subscription, BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map, tap }              from 'rxjs/operators';
import { NxConfigService, IConfig }                    from './nx-config';
import { NxLanguageProviderService }                   from './nx-language-provider';
import { NxCloudApiService }                           from './nx-cloud-api';
import { NxPollService }                               from './poll.service';
import { LocalStorageService }                         from 'ngx-store';
import { NxToastService }                              from '../dialogs/toast.service';
import { NxUtilsService }                              from './utils.service';
import { NxUriService }                                from './uri.service';
import { NxRibbonService }                             from '../components/ribbon/ribbon.service';
import { LanguageI18NStaticTypes }                     from '../../language_i18n_static_types';
import { NxSystem }                                    from './system.service';
import { IParams } from '../components/search/search.component';

@Injectable({
    providedIn: 'root'
})
export class NxSystemsService implements OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    private activeSubscription: Subscription;
    private currentUser: string;
    private mergingSystems: Set<string>;
    systems: NxSystemWithUserInfo[];
    systemsPoll: Observable<NxSystemWithUserInfo[]> | any; // TODO: Remove any once resolve type issue with settings.compontent.ts line 123
    systemsSubject = new ReplaySubject<NxSystemWithUserInfo[]>(0);
    finishedMerged = false;
    systemsMerging: { primary: NxSystemWithUserInfo, secondary: NxSystemWithUserInfo } = {
        primary   : undefined,
        secondary : undefined
    };

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        pollService: NxPollService,
        private cloudApi: NxCloudApiService,
        private localStorage: LocalStorageService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        private uriService: NxUriService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
        if (!this.CONFIG.isLocal) {
            this.systemsPoll = pollService.createPoll(() => this.cloudApi.systems(), this.CONFIG.updateInterval);
        }
        this.mergingSystems = new Set();
    }

    processMerge<T extends {primary: NxSystemWithUserInfo, secondary: NxSystemWithUserInfo}>(mergeInfo: T) {
        this.systemsMerging.primary = mergeInfo.primary;
        this.systemsMerging.secondary = mergeInfo.secondary;
    }

    addToMergeList(systemId: string) {
        this.mergingSystems.add(systemId);
    }

    private removeFromMergeList(systemId: string) {
        if (this.mergingSystems.has(systemId)) {
            this.mergingSystems.delete(systemId);

            const message = this.LANG.toastMessage.system.merge.success
                .replace('{{primaryName}}', this.systemsMerging.primary.name)
                .replace('{{secondaryName}}', this.systemsMerging.secondary.name);
            this.systemsMerging = {
                primary   : undefined,
                secondary : undefined
            };
            const options = {
                autohide  : true,
                classname : this.CONFIG.toast.success,
                delay     : this.CONFIG.alertTimeout
            };
            this.toastService.show(message, options);
            this.finishedMerged = true;
        }
    }

    forceUpdateSystems(userEmail?: string): Observable<NxSystemWithUserInfo[]> {
        if (userEmail) {
            this.currentUser = userEmail;
        }

        return this.cloudApi.systems().pipe(tap((systems) => {
            this.processSystems(systems);
            this.systemsSubject.next(systems);
        }));
    }

    forceUpdateSystemsAsPromise(userEmail?: string): Promise<NxSystemWithUserInfo[]> {
        return this.forceUpdateSystems(userEmail).toPromise();
    }

    getSystemOwnerName(system: NxSystem, currentUserEmail: string, forOrder?: boolean) {
        // @ts-ignore: TODO either using wrong type for system or NxSystem missing properties. Can't find any class with property ownerAccountEmail
        if (system.ownerAccountEmail === currentUserEmail) {
            if (forOrder) {
                // @ts-ignore: TODO either using wrong type for system or NxSystem missing properties. Can't find any class with property name
                return `!!!!!!!${system.name}`; // Force my systems to be first
            }
            return this.LANG.system.yourSystem();
        }
        // @ts-ignore: TODO either using wrong type for system or NxSystem missing properties. Can't find any class with property ownerFullName
        if (system.ownerFullName && system.ownerFullName.trim() !== '') {
            // @ts-ignore: TODO either using wrong type for system or NxSystem missing properties. Can't find any class with property ownerFullName
            return system.ownerFullName;
        }
        // @ts-ignore: TODO either using wrong type for system or NxSystem missing properties. Can't find any class with property ownerAccountEmail
        return system.ownerAccountEmail;
    }

    getMySystems(currentUserEmail: string, currentSystemId: string): NxSystem[] {
        return this.systems.filter((system) => {
            return system.ownerAccountEmail === currentUserEmail && system.id !== currentSystemId;
        }).sort((a, b) => {
            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        });
    }

    getSystem(systemId: string, useCache = true): Observable<NxSystemWithUserInfo> {
        let system;
        if (this.systems && this.systems.length > 0) {
            system = this.systems.find((system) => {
                return system.id === systemId;
            });
        }

        if (system && useCache) { // Cache success
            return of(system);
        } else { // Cache miss
            return this.cloudApi.systems(systemId).pipe(map((systems) => {
                return systems[0];
            }));
        }
    }

    getSystemAsPromise(systemId: string, useCache = true) {
        return this.getSystem(systemId, useCache).toPromise();
    }

    getSystems(userEmail: string) {
        this.currentUser = userEmail;
        if (this.activeSubscription) {
            this.activeSubscription.unsubscribe();
        }
        this.activeSubscription = this.systemsPoll
            .pipe(
                tap((systems: NxSystemWithUserInfo[]) => this.processSystems(systems)),
                distinctUntilChanged((a, b) => NxUtilsService.isEqual(a, b))
            )
            .subscribe(() => this.systemsSubject.next(this.systems));
    }

    stopPoll() {
        if (this.activeSubscription) {
            this.activeSubscription.unsubscribe();
        }
    }

    ngOnDestroy(): void {
        if (this.activeSubscription) {
            this.stopPoll();
        }
    }

    private processSystems(systems: NxSystemWithUserInfo[]) {
        this.systems = this.sortSystems(systems, this.currentUser);
        this.systems.forEach((system) => {
            system.isMine = system.ownerAccountEmail === this.currentUser;
            system.canMerge = system.isMine &&
            (system.capabilities?.cloudMerge ||
                this.CONFIG.clientMode.debug ||
                this.CONFIG.clientMode.beta);
            if (system.mergeInfo !== undefined) {
                this.addToMergeList(system.id);
            } else if (this.mergingSystems.has(system.id)) {
                const currentSystemId = this.localStorage.get('systemId');
                if (this.systemsMerging.secondary && currentSystemId === this.systemsMerging.secondary.id) {
                    this.uriService.updateURI(`/systems/${this.systemsMerging.primary.id}`, {});
                }
                if (this.systemsMerging.primary && currentSystemId === this.systemsMerging.primary.id) {
                    this.ribbonService.hide();
                }
                this.removeFromMergeList(system.id);
            }
        });
    }

    private sortSystems(systems: NxSystemWithUserInfo[], currentUserEmail: string): NxSystemWithUserInfo[] {
        // Alphabet sorting
        const preSort = systems.sort((systemA, systemB) => {
            const systemAName = this.getSystemOwnerName(systemA, currentUserEmail, true);
            const systemBName = this.getSystemOwnerName(systemB, currentUserEmail, true);
            return systemAName < systemBName ? -1 : 1;
        });
        // Sort by usage frequency is more important than Alphabet
        return preSort.sort((systemA, systemB) => {
            // @ts-ignore: TODO can't find usageFrequency property declared anywhere
            return -systemA.usageFrequency < -systemB.usageFrequency ? -1 : 1;
        });
    }
}

export interface NxSystemWithUserInfo extends NxSystem {
    ownerAccountEmail: string;
    name: string;
    isMine: boolean;
    capabilities: IParams;
    state: string;
    stateOfHealth: string;
}
