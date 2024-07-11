import { Injectable, Injector } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, catchError, forkJoin, from, map, switchMap } from 'rxjs';

import { SystemResourcesActions, SystemResourcesTypes } from '@common/store/system-resources';
import { environment } from '@environments/environment';
import { nxSystemFactory } from '@services/system/factories/initial-system-factory';
import { NxSystemBase } from '@services/system/system-base';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystemsService } from '@services/systems.service';
import { ObservableValueType } from '@utils/general';
import { memoizeAsyncPersistent } from '@utils/memoize';

import { RecordingStatus } from './camera-manager/camera-manager-types';
import { NxSystem } from './system';

@Injectable({
    providedIn: 'root',
})
export class NxSystemService {
    private system: NxSystem | undefined;
    private systemsCache: { [systemId: string]: NxSystem } = {};

    constructor(
        injector: Injector,
        private systemsService: NxSystemsService,
        private store: Store,
    ) {
        NxSystemBase.INJECTOR ||= injector;
    }

    currentSystem$ = new BehaviorSubject<NxSystem | undefined>(undefined);

    getCurrentSystem(): NxSystem {
        const system = this.currentSystem$$();
        if (!system?.subscriberCount) {
            system?.startPoll(system.id);
        }
        return system;
    }

    setSystem(system: NxSystem): void {
        if (system.id !== this.currentSystem$$()?.id) {
            this.currentSystem$.next(system);
            this.store.dispatch(
                SystemResourcesActions.refreshSystemResources({
                    systems: { [system.id]: { all: true } },
                }),
            );
        }
    }

    currentSystem$$ = toSignal(this.currentSystem$);

    getSystemResources(
        systemId: string,
        refreshConfig: SystemResourcesTypes.LoadPartialSystemResources,
    ): Observable<Partial<SystemResourcesTypes.SystemResourcesTypeMap>> {
        const system = this.createSystem(this.systemsService.userEmail, systemId, null, true, true);
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        const errorHandler = async <T extends Observable<unknown[]>>(_: unknown, caught: T) =>
            [] as ObservableValueType<T>;
        const update = {
            [SystemResourcesTypes.SystemResourceTypeEnums.CAMERAS]: refreshConfig.cameras
                ? from(system.cameraManager.getCameras()).pipe(
                      switchMap(cameras =>
                          system.cameraManager.hasArchives().pipe(
                              catchError(errorHandler),
                              map(camerasWithArchives =>
                                  cameras.map(({ recordingStatus, ...camera }) => ({
                                      ...camera,
                                      recordingStatus: camerasWithArchives.includes(camera.id)
                                          ? RecordingStatus.Archive
                                          : recordingStatus,
                                  })),
                              ),
                          ),
                      ),
                      catchError(errorHandler),
                  )
                : null,
            [SystemResourcesTypes.SystemResourceTypeEnums.SERVERS]: refreshConfig.servers
                ? system.serverManager.getServers().pipe(catchError(errorHandler))
                : null,
            [SystemResourcesTypes.SystemResourceTypeEnums.LAYOUTS]: refreshConfig.layouts
                ? (system.mediaserver as NxSystemRestAPI)
                      .getLayouts()
                      .pipe(catchError(errorHandler))
                : null,
            [SystemResourcesTypes.SystemResourceTypeEnums.WEB_PAGES]: refreshConfig.webPages
                ? (system.mediaserver as NxSystemRestAPI)
                      .getWebPages()
                      .pipe(catchError(errorHandler))
                : null,
        };

        for (const key in update) {
            if (update[key] === null) {
                delete update[key];
            }
        }

        return forkJoin(update);
    }

    createSystemById = (systemId: string, skipPoll = true, skipSettingSystem = true): NxSystem =>
        this.createSystem(this.systemsService.userEmail, systemId, '', skipPoll, skipSettingSystem);

    createSystem(
        currentUserEmail: string,
        systemId: string,
        serverId: string = null,
        skipPoll = false,
        skipSettingSystem = false,
        version: number = undefined,
    ): NxSystem {
        const id = systemId || serverId;
        const cloudSystemInfo = (this.systemsService.systems || []).find(
            system => system.id === id,
        );
        let system: NxSystem;
        if (id in this.systemsCache) {
            system = this.systemsCache[id];
        } else {
            system = nxSystemFactory(
                currentUserEmail,
                systemId,
                serverId,
                undefined,
                cloudSystemInfo?.version || version,
                skipSettingSystem,
            );

            if (cloudSystemInfo?.version) {
                this.systemsCache[id] = system;
            }
        }

        this.system ??= system;

        if (environment.isLocal || skipSettingSystem) {
            return system;
        }

        this.system = system;

        // This is done to set the auth keys for video. Local doesn't need auth keys
        // because cookies are same site and will be attached to all requests.
        if (!environment.isLocal) {
            this.system.updateSystemAuth(true).catch(() => {});
        }

        this.system.lostConnection = false;

        if (cloudSystemInfo?.useRest) {
            (this.system.mediaserver as NxSystemRestAPI)
                .setAccessTokenAsCookie()
                .subscribe(() => {});
        }
        if (id !== this.currentSystem$$()?.id) {
            this.currentSystem$$()?.stopPoll();
        }

        this.setSystem(this.system);
        // this.system.lostConnection = false;
        if (!skipPoll) {
            this.currentSystem$$()?.startPoll(systemId);
        }
        return this.currentSystem$$();
    }

    @memoizeAsyncPersistent
    createLocalSystem(
        mediaServer: NxSystemRestAPI | NxSystemRestAPI2,
        userId: string,
        userEmail = '',
    ): NxSystem {
        if (this.system === undefined) {
            this.system = nxSystemFactory(userEmail, '', '', userId, mediaServer.version);
            this.system.mediaserver = mediaServer;
            this.system.canMerge = true;
            this.setSystem(this.system);
        }

        if (this.system.subscriberCount === 0) {
            this.system.startPoll();
        }

        if (!this.systemsService.systems) {
            // @ts-expect-error: [NxSystem] when local, should be fine for now
            // since systems service is used a lot more on cloud-only pages
            // but this might need fixing in the future
            this.systemsService.systems = [this.system];
        }
        return this.system;
    }

    logoutAllSystems(): Promise<unknown> {
        return Promise.all(
            Object.values(this.systemsCache).map(system =>
                system.mediaserver.logout().catch(() => false),
            ),
        );
    }

    removeCurrentSystem(): void {
        this.currentSystem$.value?.stopPoll();
        this.currentSystem$.next(undefined);
        this.system = undefined;
    }
}
