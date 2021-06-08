import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import IMediaServer from '../datatypes/IMediaServer';
import Camera from '../datatypes/Camera';
// import testMediaServers from '../testMediaServers'
import { GUID, ms } from '../../../utils/type-aliases';
import {
    VmsState,
    VMS_MODE,
    createNotInitializedState,
    createCameraNotSelectedState,
    createCameraSelectedState
} from '../datatypes/VmsState';
import ICamera, { CameraArchive } from '../datatypes/ICamera';
import { ServerTimeInfo } from '@services/system.service';

@Injectable({
    providedIn: 'root'
})
export class VideoManagementSystemService {
    static readonly statusRefreshInterval = 15000

    protected _logPrefix: string = 'VMS_SERVICE ::'
    protected _logDisable: boolean = true

    protected _log (...args: any[]) {
        if (isDevMode() && !this._logDisable) {
            // eslint-disable-next-line no-useless-call
            console.log.apply(console, [this._logPrefix, ...arguments]);
        }
    }

    protected _warn (...args: any[]) {
        if (isDevMode() && !this._logDisable) {
            // eslint-disable-next-line no-useless-call
            console.warn.apply(console, [this._logPrefix, ...arguments]);
        }
    }

    constructor(
        protected cookieService: CookieService
    ) {
        this._log('constructor');
        this.reset();
    }

    public reset () {
        this._log('reset');
        this._state = createNotInitializedState();
        this._emit();
    }

    protected _subject = new BehaviorSubject<VmsState>(createNotInitializedState())
    protected _selectedCamera = new BehaviorSubject<ICamera>(undefined);

    protected _emit (): void {
        this._log('_emit', { ...this.state });
        this._subject.next(this.state);
    }

    public get subject (): BehaviorSubject<VmsState> {
        return this._subject;
    }

    protected _systemId: string = undefined

    public get systemId (): string {
        return this._systemId;
    }

    protected _state: VmsState = createNotInitializedState()

    public get state (): VmsState {
        return this._state;
    }

    public get selectedCamera () {
        return this._selectedCamera.getValue();
    }

    public set selectedCamera (camera) {
        this._selectedCamera.next(camera);
    }

    protected _serverTimes: Array<ServerTimeInfo> = []

    public set serverTimes (st: Array<ServerTimeInfo>) {
        this._serverTimes = [...st];
        // if (this.serverTimes?.length) {
        //     console.log('SET TIMEZONE', this.serverTimes[0].timeZoneOffset)
        // }
    }

    public get serverTimes() {
        return this._serverTimes;
    }

    public get timeZoneOffset (): ms {
        if (!this.serverTimes?.length) {
            return 0;
        }
        const clientTZO = -(new Date()).getTimezoneOffset() * 60000
        const serverTZO = this.serverTimes[0].timeZoneOffset
        // console.log('timeZoneOffset', clientTZO, serverTZO, clientTZO - serverTZO)
        return serverTZO - clientTZO; // use yourTimestampMs + vms.timeZoneOffset to display server time on client
    }

    public setMediaServers (systemId: string, mediaServers: Array<IMediaServer>, updateCamerasOnly = false) {
        this._log('setMediaServers', systemId, mediaServers, updateCamerasOnly);
        this._systemId = systemId;
        // @ts-ignore
        const prevSelectedCameraId: GUID | undefined = this._state?.selectedCameraId;
        this._state = createCameraNotSelectedState(systemId, mediaServers);
        if (prevSelectedCameraId) {
            this._state = createCameraSelectedState(this._state, prevSelectedCameraId);
        }
        if (!updateCamerasOnly) {
            this._emit();
        }
    }

    public setCameraRecords (cameraId: string, range, records) {
        if (this._state.mode !== VMS_MODE.NOT_INITIALIZED) {
            this._state.mediaServers.map(ms => {
                const c = ms.cameras.find(c => c.id === cameraId);
                if (c) {
                    c.setRecords(range, records);
                }
            });
        } else {
            this._warn('attempt to set camera records while in NOT_INITIALIZED state', cameraId, range, records);
        }
    }

    public setCameraNewlyRecordedChunks (cameraId: string, records: CameraArchive) {
        if (this._state.mode !== VMS_MODE.NOT_INITIALIZED) {
            this.selectedCamera.setNewlyRecordedChunks(records);
        } else {
            this._warn('attempt to set camera newly recorded records while in NOT_INITIALIZED state', cameraId, records);
        }
    }

    // Test routine
    // public setTestMediaServers () {
    //   this.setMediaServers('test', testMediaServers)
    // }

    public selectCamera (cameraId: GUID) {
        if (this._state.mode === VMS_MODE.NOT_INITIALIZED) {
            this._warn('attempt to select camera while VMS is not initialized yet');
            return;
        }
        this._state = createCameraSelectedState(this._state, cameraId);
        if (this._state.mode === VMS_MODE.CAMERA_SELECTED) {
            this.selectedCamera = this._state.selectedCamera;
        }
        const cookieName = `nx_last_accessed_camera_for_system_${this.systemId}`;
        this.cookieService.set(cookieName, cameraId, 365, '/');
        this._emit();
    }

    public clearCameraSelection () {
        if (this._state.mode === VMS_MODE.NOT_INITIALIZED) {
            this._warn('attempt to clear camera selection while VMS is not initialized yet');
            return;
        }
        this._state = createCameraNotSelectedState(this.systemId, this._state.mediaServers);
        this._emit();
    }

    public getLastAccessedCameraId () {
        switch (this.state.mode) {
            case VMS_MODE.NOT_INITIALIZED:
                return null;
            case VMS_MODE.CAMERA_SELECTED:
                return this.selectedCamera.id;
            case VMS_MODE.CAMERA_NOT_SELECTED: {
                const cookieName = `nx_last_accessed_camera_for_system_${this.systemId}`;
                const cookieCameraId = this.cookieService.get(cookieName);
                if (cookieCameraId) {
                    const thisCameraExists = !!this.state.mediaServers.find(ms => ms.cameras.find(c => c.id === cookieCameraId));
                    if (thisCameraExists) {
                        return cookieCameraId;
                    }
                }

                // fallback one: first online camera
                const cameraChecker = (c: ICamera) => c.isOnline;
                const firstMediaServerWithAnOnlineCamera = this.state.mediaServers.find(ms => ms.cameras.find(cameraChecker));
                if (firstMediaServerWithAnOnlineCamera) {
                    const firstOnlineCamera = firstMediaServerWithAnOnlineCamera.cameras.find(cameraChecker);
                    return firstOnlineCamera.id;
                }

                // fallback two: simply use the first camera available
                const firstMediaServer = this.state.mediaServers.find(ms => ms.cameras?.length);
                if (firstMediaServer) {
                    return firstMediaServer.cameras[0].id;
                }
                return null;
            }
        }
    }
}

export default VideoManagementSystemService;
