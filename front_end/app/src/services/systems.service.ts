import { Injectable, OnDestroy } from '@angular/core';
import { of, ReplaySubject } from 'rxjs';
import { tap } from 'rxjs/operators';

import { NxConfigService } from './nx-config';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxCloudApiService } from './nx-cloud-api';
import { NxPollService } from './poll.service';

@Injectable({
    providedIn: 'root'
})
export class NxSystemsService implements OnDestroy {
    CONFIG: any;
    LANG: any;
    activeSubscription: any;
    currentUser: string;
    systems: any;
    systemsPoll: any;
    systemsSubject = new ReplaySubject(0);
    constructor(private cloudApi: NxCloudApiService,
                private config: NxConfigService,
                private language: NxLanguageProviderService,
                private pollService: NxPollService) {
        this.LANG = this.language.getTranslations();
        this.CONFIG = this.config.getConfig();
        this.systemsPoll = pollService.createPoll(this.cloudApi.systems(), this.CONFIG.updateInterval);
    }

    forceUpdateSystems() {
        return this.cloudApi.systems().pipe(tap((systems) => {
            this.processSystems(systems);
            this.systemsSubject.next(systems);
        }));
    }

    forceUpdateSystemsAsPromise() {
        return this.forceUpdateSystems().toPromise();
    }

    getSystemOwnerName (system, currentUserEmail, forOrder?) {
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

    getMySystems(currentUserEmail, currentSystemId) {
        return this.systems.filter((system) => {
            return system.ownerAccountEmail === currentUserEmail && system.id !== currentSystemId;
        }).sort((a, b) => {
            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        });
    }

    getSystem(systemId) {
        const system = this.systems.find((system) => {
            return system.id === systemId;
        });

        if (system) { // Cache success
            return of(system);
        } else { // Cache miss
            return this.cloudApi.systems(systemId);
        }
    }

    getSystemAsPromise(systemId) {
        return this.getSystem(systemId).toPromise();
    }
    getSystems(userEmail) {
        this.currentUser = userEmail;
        if (this.activeSubscription) {
            this.activeSubscription.unsubscribe();
        }
        this.activeSubscription = this.systemsPoll.subscribe((systems) => {
            this.processSystems(systems);
            this.systemsSubject.next(this.systems);
        });
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
    private processSystems(systems) {
        this.systems = this.sortSystems(systems, this.currentUser);
        this.systems.forEach((system) => {
            system.isMine = system.ownerAccountEmail === this.currentUser;
            system.canMerge = system.isMine && (system.capabilities &&
                system.capabilities.indexOf(this.CONFIG.systemCapabilities.cloudMerge) > -1
                || this.CONFIG.allowDebugMode
                || this.CONFIG.allowBetaMode);
        });
    }

    private sortSystems(systems, currentUserEmail) {
        // Alphabet sorting
        const preSort = systems.sort((systemA, systemB) => {
            const systemAName = this.getSystemOwnerName(systemA, currentUserEmail, true);
            const systemBName = this.getSystemOwnerName(systemB, currentUserEmail, true);
            return systemAName < systemBName ? -1 : 1;
        });
        // Sort by usage frequency is more important than Alphabet
        return preSort.sort((systemA, systemB) => {
            return -systemA.usageFrequency < -systemB.usageFrequency ? -1 : 1;
        });
    }

}
