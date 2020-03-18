import { Injectable, OnDestroy }                       from '@angular/core';
import { of, ReplaySubject, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map, tap }              from 'rxjs/operators';
import { NxConfigService, IConfig }                    from './nx-config';
import { NxLanguageProviderService }                   from './nx-language-provider';
import { NxCloudApiService }                           from './nx-cloud-api';
import { NxPollService }                               from './poll.service';
import { NxToastService }                              from '../dialogs/toast.service';
import { NxUtilsService }                              from './utils.service';
import { LanguageI18NStaticTypes }                     from '../../language_i18n_static_types';
import { NxSystem }                                    from './system.service';

@Injectable({
    providedIn: 'root'
})
export class NxSystemsService implements OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    activeSubscription: Subscription;
    currentUser: string;
    mergingSystems: { [key: string]: { primary: any, secondary: any }; };
    // TODO: Having trouble creating type for systems and systemPoll
    systems: any;
    systemsPoll: any;
    systemsSubject = new ReplaySubject(0);
    systemsMerging: { primary: any, secondary: any } = {
        primary   : undefined,
        secondary : undefined
    };

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        pollService: NxPollService,
        private cloudApi: NxCloudApiService,
        private toastService: NxToastService
    ) {
        this.LANG = languageService.getTranslations();
        this.CONFIG = configService.getConfig();
        this.systemsPoll = pollService.createPoll(this.cloudApi.systems(), this.CONFIG.updateInterval);
        this.mergingSystems = {};
    }

    addToMergeList(systemId: string, mergeInfo: any) {
        this.mergingSystems[systemId] = mergeInfo;
    }

    removeFromMergeList(systemId: string) {
        if (systemId in this.mergingSystems) {
            delete this.mergingSystems[systemId];
            const options = {
                autoHide  : true,
                classname : this.CONFIG.toast.success,
                delay     : this.CONFIG.alertTimeout
            };
            this.toastService.show(this.LANG.toastMessage.system.merge.success, options);
        }
    }

    forceUpdateSystems(userEmail?: string): Observable<any> {
        if (userEmail) {
            this.currentUser = userEmail;
        }

        return this.cloudApi.systems().pipe(tap((systems) => {
            this.processSystems(systems);
            this.systemsSubject.next(systems);
        }));
    }

    forceUpdateSystemsAsPromise(userEmail?: string): Promise<any> {
        return this.forceUpdateSystems(userEmail).toPromise();
    }

    getSystemOwnerName(system: NxSystem, currentUserEmail: string, forOrder?: boolean) {
        // @ts-ignore: TODO either using wrong type for system or NxSystem missing properties. Can't find any class with property ownerAccountEmail
        if (system.ownerAccountEmail === currentUserEmail) {
            if (forOrder) {
                // @ts-ignore: TODO either using wrong type for system or NxSystem missing properties. Can't find any class with property name
                return `!!!!!!!${system.name}`; // Force my systems to be first
            }
            return this.LANG.system.yourSystem;
        }
        // @ts-ignore: TODO either using wrong type for system or NxSystem missing properties. Can't find any class with property ownerFullName
        if (system.ownerFullName && system.ownerFullName.trim() !== '') {
            // @ts-ignore: TODO either using wrong type for system or NxSystem missing properties. Can't find any class with property ownerFullName
            return system.ownerFullName;
        }
        // @ts-ignore: TODO either using wrong type for system or NxSystem missing properties. Can't find any class with property ownerAccountEmail
        return system.ownerAccountEmail;
    }

    getMySystems(currentUserEmail: string, currentSystemId: string) {
        return this.systems.filter((system) => {
            return system.ownerAccountEmail === currentUserEmail && system.id !== currentSystemId;
        }).sort((a, b) => {
            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        });
    }

    getSystem(systemId: string, useCache = true) {
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
                tap((systems: NxSystem[]) => this.processSystems(systems)),
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
        if (this.systemsPoll) {
            this.systemsPoll.unsubscribe();
        }
    }

    private processSystems(systems: NxSystem[]) {
        this.systems = this.sortSystems(systems, this.currentUser);
        this.systems.forEach((system) => {
            system.isMine = system.ownerAccountEmail === this.currentUser;
            system.canMerge = system.isMine && (system.capabilities &&
                system.capabilities.cloudMerge ||
                this.CONFIG.clientMode.debug ||
                this.CONFIG.clientMode.beta);
            if (system.mergeInfo !== undefined) {
                const mergeInfo: any = {
                    primary   : {},
                    secondary : {}
                };
                if (system.mergeInfo.role === 'master') {
                    mergeInfo.primary.id = system.id;
                    mergeInfo.secondary.id = system.mergeInfo.anotherSystemId;
                } else {
                    mergeInfo.primary.id = system.mergeInfo.anotherSystemId;
                    mergeInfo.secondary.id = system.id;
                }
                this.addToMergeList(system.id, mergeInfo);
            } else if (system.id in this.mergingSystems) {
                setTimeout(() => {
                    this.removeFromMergeList(system.id);
                }, 500);
            }
        });
    }

    private sortSystems(systems: NxSystem[], currentUserEmail: string): NxSystem[] {
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
