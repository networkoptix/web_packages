import { HttpClient } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash-es';
import { of, ReplaySubject, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';

import * as SystemsActions from '../store/systems/systems.actions';

import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxLanguageProviderService } from './nx-language-provider';
import { NxPollService } from './poll.service';
import { NxStorageService } from './storage.service';
import type { NxSystem } from './system.service/system';
import type { NxSystemWithUserInfo } from './system.service/system-types';
import { NxUriService } from './uri.service';

@Injectable({
    providedIn: 'root'
})
export class NxSystemsService implements OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    private activeSubscription: Subscription;
    private currentUser: string;
    mergingSystems: Set<string>;
    systems: NxSystemWithUserInfo[];
    systemsPoll: Observable<NxSystemWithUserInfo[]> | any; // TODO: Remove any once resolve type issue with settings.compontent.ts line 123
    systemsSubject = new ReplaySubject<NxSystemWithUserInfo[]>(0);
    finishedMerged = false;
    systemsMerging: { primary: NxSystemWithUserInfo, secondary: NxSystemWithUserInfo } = {
        primary: undefined,
        secondary: undefined
    };

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        pollService: NxPollService,
        private http: HttpClient,
        private storageService: NxStorageService,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        private uriService: NxUriService,
        private store: Store,
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
        this._registerStoreConnection();
        if (!environment.isLocal) {
            this.systemsPoll = pollService.createPoll(() => this._getSystems(), this.CONFIG.updateInterval);
        } else {
            this.systemsSubject.next([]);
        }
        this.mergingSystems = new Set();
    }

    protected _registerStoreConnection(): void {
        this.systemsSubject.subscribe((systems: Array<NxSystemWithUserInfo>) => {
            this.store.dispatch(SystemsActions.set({ systems }));
        });
    }

    get isPolling() {
        return this.systemsPoll?.destination?.observers?.length > 0;
    }

    processMerge<T extends { primary: NxSystemWithUserInfo, secondary: NxSystemWithUserInfo }>(mergeInfo: T): void {
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
            const options = {
                autohide: true,
                classname: this.CONFIG.toast.success,
                delay: this.CONFIG.alertTimeout
            };
            this.toastService.show(message, options);
            this.finishedMerged = true;
        }
    }

    private _getSystems(systemId?: string) {
        if (systemId) {
            return this.http.get<NxSystemWithUserInfo[]>(this.CONFIG.apiBase + '/systems/' + systemId);
        }
        return this.http.get<NxSystemWithUserInfo[]>(this.CONFIG.apiBase + '/systems');
    }

    forceUpdateSystems(userEmail?: string): Observable<NxSystemWithUserInfo[]> {
        if (userEmail) {
            this.currentUser = userEmail;
        }

        if (environment.isLocal) {
            this.systemsSubject.next([]);
            return of([]);
        }

        return this._getSystems().pipe(tap(systems => {
            this.processSystems(systems);
            this.systemsSubject.next(systems);
        }));
    }

    forceUpdateSystemsAsPromise(userEmail?: string): Promise<NxSystemWithUserInfo[]> {
        return this.forceUpdateSystems(userEmail).toPromise();
    }

    canViewInfo(userRole) {
        return this.CONFIG.accessRoles.adminAccess.includes(userRole.toLowerCase());
    }

    getSystemOwnerName(
        system: NxSystemWithUserInfo,
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

    getMySystems(currentUserEmail: string, currentSystemId: string): NxSystem[] {
        return this.systems.filter(system =>
            system.ownerAccountEmail === currentUserEmail &&
            system.id !== currentSystemId
        ).sort((a, b) => {
            return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
        });
    }

    getSystem(systemId: string, useCache = true): Observable<NxSystemWithUserInfo> {
        let system;
        if (this.systems && this.systems.length > 0) {
            system = this.systems.find(system => {
                return system.id === systemId;
            });
        }

        if (system && useCache) { // Cache success
            return of(system);
        } else { // Cache miss
            return this._getSystems(systemId).pipe(map(systems => {
                return systems[0];
            }));
        }
    }

    getSystemAsPromise(systemId: string, useCache = true) {
        return this.getSystem(systemId, useCache).toPromise();
    }

    getSystems(userEmail: string): void {
        this.currentUser = userEmail;
        if (this.activeSubscription) {
            this.activeSubscription.unsubscribe();
        }
        this.activeSubscription = this.systemsPoll
            .pipe(
                tap((systems: NxSystemWithUserInfo[]) => this.processSystems(systems)),
                distinctUntilChanged((a, b) => isEqual(a, b))
            )
            .subscribe(() => this.systemsSubject.next(this.systems));
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

    private processSystems(systems: NxSystemWithUserInfo[]): void {
        this.systems = this.sortSystems(systems, this.currentUser);
        this.systems.forEach(system => {
            system.name = system.name || system.systemName;
            system.isMine = system.ownerAccountEmail === this.currentUser || system.currentUser?.isLocalOwner;
            system.canMerge = system.isMine &&
            (system.capabilities?.cloudMerge ||
                this.CONFIG.clientMode.debug ||
                this.CONFIG.clientMode.beta);
            system.useRest = parseInt(system.version[0] || '0') > 4;

            this.checkMerge(system);
        });
    }

    checkMerge(system: NxSystem) {
        if (system.mergeInfo !== undefined) {
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

    private sortSystems(systems: NxSystemWithUserInfo[], currentUserEmail: string): NxSystemWithUserInfo[] {
        // Alphabet sorting
        const preSort = systems.sort((systemA, systemB) => {
            const systemAName = this.getSystemOwnerName(systemA, currentUserEmail, true);
            const systemBName = this.getSystemOwnerName(systemB, currentUserEmail, true);
            return systemAName < systemBName ? -1 : 1;
        });
        // Sort by usage frequency is more important than Alphabet
        return preSort.sort((systemA, systemB) => {
            // @ts-expect-error: TODO can't find usageFrequency property declared anywhere
            return -systemA.usageFrequency < -systemB.usageFrequency ? -1 : 1;
        });
    }
}
