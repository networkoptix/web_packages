import { computed, Injectable, signal } from '@angular/core';

import { GUID, ms } from '@view/datatypes/type-aliases';

import { ViewCamera } from '../datatypes/Camera';
import { ViewMediaServer } from '../datatypes/IMediaServer';
import type { BaseTimeRange } from '../datatypes/TimeRange';
import { VMS_MODE, VmsServerTimeInfo, VmsState } from '../datatypes/VmsState';
// import testMediaServers from '../testMediaServers'

// these two types allow separation of
// timezone-agnostic and timezone-aware timestamps
// see the longer "Handling Time Zones" comment bellow
type fairMs = ms;
type tweakedMs = ms;

const initializeVmsState = (): VmsState => ({
    mode: VMS_MODE.NOT_INITIALIZED,
    systemId: '',
    mediaServers: [],
    cameras: {},
    selectedCameraId: '',
    selectedCamera: undefined,
});

@Injectable({
    providedIn: 'root',
})
export class VideoManagementSystemService {
    static readonly statusRefreshInterval = 15000;
    state$$ = signal<VmsState>(initializeVmsState());
    serverTimes$$ = signal<Array<VmsServerTimeInfo>>([]);
    systemId$$ = computed<string>(() => this.state$$().systemId);
    playerActive = false;

    constructor() {
        this.reset();
    }

    reset(): void {
        // console.log('reset');
        this.state$$.set(initializeVmsState());
        this.serverTimes$$.set([]);
    }

    get selectedCamera(): ViewCamera | undefined {
        return this.state$$().selectedCamera;
    }

    /*
        Handling Time Zones

        As of 2021.06.14, Javascript Temporal is still not ready for production use,
        while simple Date is strictly bound to the local timezone.

        So, it's important to understand that it's a cheat of sorts:
        we use timestamps that are not *fair*, but *tweaked* by adding some offset.

        Initally, timestamps themselves are timezone-agnostic,
        being just a number of (milli)seconds passed since 1970 in UTC/GMT.
        Sometimes we adjust these numbers, pretending we shifted in past or future,
        according to the difference in timezones. That's what called tweaking here.

        Tweaking a timestamp should be used only in two cases:
        1) for aligining to some grid in a timezone different from the local one:
            * let's say you have a local time of 15:15 in GMT+3
            * and you want to get the "nearest timestamp in module 1H at GMT+4.5" timestamp
            * so, you shift to GMT+4.5 by tweaking the timestamp
            * then you align by modulo 1H (by setting m, s, ms to zero, or otherwise)
            * and then you shift back, untweaking the timestamp:
            pseudocode:
            untweak(align(tweak("15:15 GMT+3", "GMT+4.5"), 1H), "GMT+4.5")
            ->
            // note here it wasn't the timezone change, but rather jump 1.5 hours ahead! the timestamp is unfair now!
            untweak(align("16:45 GMT+3", 1H), "GMT+4.5")
            ->
            untweak("16:00 GMT+3", "GMT+4.5")    // of untweak("17:00 GMT+3", "GMT+4.5"))) if aligning to the right
            ->
            "14:30 GMT+3"   // corresponding to "16:00 GMT+4.5", and being a fair timestamp again
        2) for presenting timestamps to user, as they look in remote timezone:
            dateformat("14:30 GMT+3", "HH:mm") -> 14:30
            dateformat(tweak("14:30 GMT+3", "GMT+4.5"), "HH:mm") -> 16:00
    */

    get timeZoneOffset(): ms {
        const serverTimes = this.serverTimes$$();
        let result = 0;
        if (!serverTimes?.length) {
            // console.warn('TZO no server times data');
        } else if (this.state$$().mode !== VMS_MODE.CAMERA_SELECTED) {
            // console.warn('TZO no camera selected');
        } else {
            const { parentServerId, preferredServerId } = this.selectedCamera ?? {};
            const targetServerIds = [parentServerId, preferredServerId];
            const preferredServerTime =
                serverTimes.find(st => targetServerIds.includes(st.serverId)) || serverTimes[0];
            const clientTZO = -new Date().getTimezoneOffset() * 60000;
            const serverTZO = preferredServerTime?.timeZoneOffset;
            if (serverTZO === undefined) {
                return 0;
            }
            // console.log('TZO', preferredServerTime, serverTZO, clientTZO, serverTZO - clientTZO)
            result = serverTZO - clientTZO;
        }
        return result;
    }

    tweakT(t: fairMs): tweakedMs {
        return t + this.timeZoneOffset;
    }

    untweakT(t: tweakedMs): fairMs {
        return t - this.timeZoneOffset;
    }

    setMediaServers(systemId: string, mediaServers: ViewMediaServer[]): void {
        // console.log('setMediaServers', systemId, mediaServers, updateCamerasOnly);
        this.state$$.update(state => {
            const prevSelectedCameraId = state.selectedCameraId;
            const cameras = mediaServers.reduce<Record<string, ViewCamera>>((acc, ms) => {
                ms.cameras.forEach(c => {
                    acc[c.id] = c;
                });
                return acc;
            }, {});
            let mode = VMS_MODE.CAMERA_NOT_SELECTED;
            let selectedCamera = state.selectedCamera;
            if (prevSelectedCameraId && prevSelectedCameraId in cameras) {
                mode = VMS_MODE.CAMERA_SELECTED;
                selectedCamera = cameras[prevSelectedCameraId];
            }
            return {
                ...state,
                systemId,
                mediaServers,
                mode,
                cameras,
                selectedCamera,
            };
        });
    }

    setCameraRecords(range: BaseTimeRange, records: BaseTimeRange[]): void {
        this.selectedCamera?.setRecords(range, records);
    }

    addRecordsToSelectedCamera(records: BaseTimeRange[]): void {
        if (this.state$$().mode !== VMS_MODE.NOT_INITIALIZED) {
            this.selectedCamera?.pushRecordedChunks(records);
        } else {
            // console.warn(
            //     'attempt to set camera newly recorded records while in NOT_INITIALIZED state',
            //     cameraId,
            //     records
            // );
        }
    }

    selectCamera(cameraId: GUID): void {
        const state = this.state$$();
        if (
            !state ||
            state.mode === VMS_MODE.NOT_INITIALIZED ||
            !state.mediaServers.length ||
            !Object.keys(state.cameras).length
        ) {
            // console.warn('attempt to select camera while VMS is not initialized yet');
            return;
        }
        this.state$$.update(state => ({
            ...state,
            mode: VMS_MODE.CAMERA_SELECTED,
            selectedCamera: state.cameras[cameraId],
            selectedCameraId: cameraId,
        }));
    }

    clearCameraSelection(): void {
        if (this.state$$().mode === VMS_MODE.NOT_INITIALIZED) {
            // console.warn('attempt to clear camera selection while VMS is not initialized yet');
            return;
        }
        this.state$$.update(state => ({
            ...state,
            mode: VMS_MODE.CAMERA_NOT_SELECTED,
            selectedCamera: undefined,
            selectedCameraId: '',
        }));
    }
}
