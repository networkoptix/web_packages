import { Injectable, Injector } from '@angular/core';
import { Router, ActivationEnd } from '@angular/router';
import { Store } from '@ngrx/store';
import {
    Observable,
    catchError,
    distinctUntilChanged,
    filter,
    forkJoin,
    from,
    map,
    shareReplay,
    switchMap,
} from 'rxjs';

import { SystemResourcesActions, SystemResourcesTypes } from '@common/store/system-resources';
import { environment } from '@environments/environment';
import { nxSystemFactory } from '@services/system/factories/initial-system-factory';
import { NxSystemBase } from '@services/system/system-base';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystemsService } from '@services/systems.service';
import { memoizeAsyncPersistent } from '@utils/memoize';

import { RecordingStatus } from './camera-manager/camera-manager-types';
import { NxSystem } from './system';

@Injectable({
    providedIn: 'root',
})
export class NxSystemService {
    private system: NxSystem;
    private systemsCache: { [systemId: string]: NxSystem } = {};

    constructor(
        injector: Injector,
        private systemsService: NxSystemsService,
        private router: Router,
        private store: Store,
    ) {
        NxSystemBase.INJECTOR ||= injector;
    }

    currentSystem$ = this.router.events.pipe(
        filter(event => event instanceof ActivationEnd),
        map((event: ActivationEnd): string => event?.snapshot?.params?.systemId),
        filter(Boolean),
        distinctUntilChanged(),
        switchMap(async systemId => {
            let system = this.systemsCache[systemId];

            if (!system) {
                system = this.createSystem(this.systemsService.userEmail, systemId, null, true);
                await system.update();
            }

            this.store.dispatch(
                SystemResourcesActions.refreshSystemResources({
                    systems: { [system.id]: { all: true } },
                }),
            );
            return system;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    getCurrentSystem(): NxSystem {
        return this.system;
    }

    getSystemResources(
        systemId: string,
        refreshConfig: SystemResourcesTypes.LoadPartialSystemResources,
    ): Observable<Partial<SystemResourcesTypes.SystemResourcesTypeMap>> {
        const system = this.createSystem(this.systemsService.userEmail, systemId, null, true, true);

        return forkJoin({
            [SystemResourcesTypes.SystemResourceTypeEnums.CAMERAS]: refreshConfig.cameras
                ? from(system.cameraManager.getCameras()).pipe(
                      switchMap(cameras =>
                          system.cameraManager.hasArchives().pipe(
                              catchError(async () => [] as string[]),
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
                  )
                : null,
            [SystemResourcesTypes.SystemResourceTypeEnums.SERVERS]: refreshConfig.servers
                ? system.serverManager.getServers()
                : null,
            [SystemResourcesTypes.SystemResourceTypeEnums.LAYOUTS]: refreshConfig.layouts
                ? (system.mediaserver as NxSystemRestAPI).getLayouts()
                : null,
            [SystemResourcesTypes.SystemResourceTypeEnums.WEB_PAGES]: refreshConfig.webPages
                ? (system.mediaserver as NxSystemRestAPI).getWebPages()
                : null,
        });
    }

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
            );

            if (cloudSystemInfo?.version) {
                this.systemsCache[id] = system;
            }
        }

        // This is done to set the auth keys for video. Local doesn't need auth keys
        // because cookies are same site and will be attached to all requests.
        if (!environment.isLocal) {
            system.updateSystemAuth(true).catch(() => {});
        }

        if (environment.isLocal || skipSettingSystem) {
            return system;
        }

        if (cloudSystemInfo?.useRest) {
            (system.mediaserver as NxSystemRestAPI).setAccessTokenAsCookie().subscribe(() => {});
        }

        this.system = system;
        this.system.lostConnection = false;
        if (!skipPoll) {
            this.system.startPoll(systemId);
        }
        return this.system;
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
}
