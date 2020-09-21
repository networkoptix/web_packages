import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import IMediaServer from '../datatypes/IMediaServer'
import Camera from '../datatypes/Camera'
import testMediaServers from '../testMediaServers'
import { GUID } from '../../../utils/type-aliases'
import {
  VmsState,
  VMS_MODE,
  createNotInitializedState,
  createCameraNotSelectedState,
  createCameraSelectedState,
} from '../datatypes/VmsState'


@Injectable({
  providedIn: 'root',
 })
export class VideoManagementSystemService {

  constructor () {
    this.reset()
  }

  public reset () {
    this._state = createNotInitializedState()
    this._emit()
  }

  protected _subject = new BehaviorSubject<VmsState>(createNotInitializedState())

  protected _emit (): void {
    this._subject.next(this.state)
  }

  public get subject (): BehaviorSubject<VmsState> {
    return this._subject
  }


  protected _state: VmsState = createNotInitializedState()

  public get state (): VmsState {
    return this._state
  }

  public get selectedCamera () {
    if (this.state.mode === VMS_MODE.CAMERA_SELECTED) {
      return this.state.selectedCamera
    } else {
      return undefined
    }
  }

  public setMediaServers (mediaServers: Array<IMediaServer>) {
    const prevSelectedCameraId: GUID | undefined = this._state['selectedCameraId']
    this._state = createCameraNotSelectedState(mediaServers)
    if (prevSelectedCameraId) {
      this._state = createCameraSelectedState(this._state, prevSelectedCameraId)
    }
    this._emit()
  }

  public setTestMediaServers () {
    this.setMediaServers(testMediaServers)
  }

  public selectCamera (cameraId: GUID) {
    if (this._state.mode === VMS_MODE.NOT_INITIALIZED) {
      console.warn('attempt to select camera while VMS is not initialized yet')
      return
    }
    this._state = createCameraSelectedState(this._state, cameraId)
    this._emit()
  }

  public clearCameraSelection () {
    if (this._state.mode === VMS_MODE.NOT_INITIALIZED) {
      console.warn('attempt to clear camera selection while VMS is not initialized yet')
      return
    }
    this._state = createCameraNotSelectedState(this._state.mediaServers)
    this._emit()
  }

}

export default VideoManagementSystemService
