import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import type { ServerTimeInfo } from '@services/system.service/system-types';
import { GUID, ms } from '@vms-client/utils/type-aliases';

import { ICamera, CameraArchive } from '../datatypes/ICamera';
import { IMediaServer } from '../datatypes/IMediaServer';
import {
    VmsState,
    VMS_MODE,
    createNotInitializedState,
    createCameraNotSelectedState,
    createCameraSelectedState,
} from '../datatypes/VmsState';
// import testMediaServers from '../testMediaServers'

// these two types allow separation of
// timezone-agnostic and timezone-aware timestamps
// see the longer "Handling Time Zones" comment bellow
type fairMs = ms;
type tweakedMs = ms;

@Injectable({
    providedIn: 'root'
})
export class VideoManagementSystemService {
    static readonly statusRefreshInterval = 15000;

    protected _logPrefix: string = 'VMS_SERVICE ::';
    protected _logDisable: boolean = true;

    protected _log(...args: any[]): void {
        if (isDevMode() && !this._logDisable) {
            // eslint-disable-next-line no-useless-call
            console.log.apply(console, [this._logPrefix, ...arguments]);
        }
    }

    protected _warn(...args: any[]): void {
        if (isDevMode() && !this._logDisable) {
            // eslint-disable-next-line no-useless-call
            console.warn.apply(console, [this._logPrefix, ...arguments]);
        }
    }

    constructor(
    ) {
        this._log('constructor');
        this.reset();
    }

    public reset(): void {
        this._log('reset');
        this._state = createNotInitializedState();
        this._serverTimes = undefined;
        this._emit();
    }

    protected _subject = new BehaviorSubject<VmsState>(createNotInitializedState());
    protected _selectedCamera = new BehaviorSubject<ICamera>(undefined);

    protected _emit(): void {
        this._log('_emit', { ...this.state });
        this._subject.next(this.state);
    }

    public get subject(): BehaviorSubject<VmsState> {
        return this._subject;
    }

    protected _systemId: string = undefined;

    public get systemId(): string {
        return this._systemId;
    }

    protected _state: VmsState = createNotInitializedState();

    public get state(): VmsState {
        return this._state;
    }

    public get selectedCamera() {
        return this._selectedCamera.getValue();
    }

    public set selectedCamera(camera) {
        this._selectedCamera.next(camera);
    }

    protected _serverTimes: Array<ServerTimeInfo>;

    public set serverTimes(st: Array<ServerTimeInfo>) {
        this._log('serverTimes set', st.map(i => i.timeZoneOffset), st);
        this._serverTimes = [...st];
    }

    public get serverTimes() {
        return this._serverTimes;
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

    public get timeZoneOffset(): ms {
        let result = 0;
        if (!this.serverTimes?.length) {
            this._warn('TZO no server times data');
        } else if (this.state.mode !== VMS_MODE.CAMERA_SELECTED) {
            this._warn('TZO no camera selected');
        } else {
            const preferredServerTime =
                this.serverTimes.find(st =>
                    st.serverId === this.selectedCamera.preferredServerId
                ) || this.serverTimes.find(
                    st => st.serverId === this.selectedCamera.parentServerId
                ) || this.serverTimes[0];
            const clientTZO = -(new Date()).getTimezoneOffset() * 60000;
            const serverTZO = preferredServerTime?.timeZoneOffset;
            if (serverTZO === undefined) {
                return 0;
            }
            // this._log('TZO', preferredServerTime, serverTZO, clientTZO, serverTZO - clientTZO)
            result = serverTZO - clientTZO;
        }
        return result;
    }

    public tweakT(t: fairMs): tweakedMs {
        return t + this.timeZoneOffset;
    }

    public untweakT(t: tweakedMs): fairMs {
        return t - this.timeZoneOffset;
    }

    public setMediaServers(
        systemId: string,
        mediaServers: Array<IMediaServer>,
        updateCamerasOnly = false
    ): void {
        this._log('setMediaServers', systemId, mediaServers, updateCamerasOnly);
        this._systemId = systemId;
        // @ts-expect-error
        const prevSelectedCameraId: GUID | undefined = this._state?.selectedCameraId;
        this._state = createCameraNotSelectedState(systemId, mediaServers);
        if (prevSelectedCameraId) {
            this._state = createCameraSelectedState(this._state, prevSelectedCameraId);
        }
        if (!updateCamerasOnly) {
            this._emit();
        }
    }

    public setCameraRecords(cameraId: string, range, records): void {
        this.selectedCamera?.setRecords(range, records);
    }

    public addRecordsToSelectedCamera(cameraId: string, records: CameraArchive): void {
        if (this._state.mode !== VMS_MODE.NOT_INITIALIZED) {
            this.selectedCamera.pushRecordedChunks(records);
        } else {
            this._warn(
                'attempt to set camera newly recorded records while in NOT_INITIALIZED state',
                cameraId,
                records
            );
        }
    }

    // Test routine
    // public setTestMediaServers () {
    //   this.setMediaServers('test', testMediaServers)
    // }

    public selectCamera(cameraId: GUID): void {
        if (this._state.mode === VMS_MODE.NOT_INITIALIZED) {
            this._warn('attempt to select camera while VMS is not initialized yet');
            return;
        }
        if (this._state.mediaServers.length === 0) {
            this._warn('Attempt to select camera with no mediaservers');
            return;
        }
        this._state = createCameraSelectedState(this._state, cameraId);
        if (this._state.mode === VMS_MODE.CAMERA_SELECTED) {
            this.selectedCamera = this._state.selectedCamera;
        }
        this._log('camera selected', this.selectedCamera);
        this._emit();
    }

    public clearCameraSelection(): void {
        if (this._state.mode === VMS_MODE.NOT_INITIALIZED) {
            this._warn('attempt to clear camera selection while VMS is not initialized yet');
            return;
        }
        this._state = createCameraNotSelectedState(this.systemId, this._state.mediaServers);
        this._emit();
    }
}
