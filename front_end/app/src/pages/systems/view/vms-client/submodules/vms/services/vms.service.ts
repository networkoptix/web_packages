import { Injectable } from '@angular/core'
import { Camera } from '../datatypes/Camera'

@Injectable({
  providedIn: 'root',
 })
export class VideoManagementSystemService {

  protected _cameras = {
    1: {
      id: 1,
      name: 'Full-featured test camera',
      status: 'Recording',
      isOnline: true,
      isRecording: true,
      isLive: true,
      hasArchive: true,
    },
    2: {
      id: 2,
      name: 'Live Recording test camera with no archive',
      status: 'Live',
      isOnline: true,
      isRecording: false,
      isLive: true,
      hasArchive: false,
    },
    3: {
      id: 3,
      name: 'Not Live, not recording test camera with archive',
      status: 'Archive',
      isOnline: true,
      isRecording: false,
      isLive: false,
      hasArchive: true,
    },
    4: {
      id: 4,
      name: 'Offline test camera',
      status: 'Offline',
      isOnline: false,
      isRecording: false,
      isLive: false,
      hasArchive: false,
    },
    5: {
      id: 5,
      name: 'Live, not recording test camera with no archive',
      status: 'Live',
      isOnline: true,
      isRecording: false,
      isLive: true,
      hasArchive: false,
    }
  }

  protected _selectedCamera: Camera = null

  public selectCamera (id: number): Camera {
    if (id in this._cameras) {
      this._selectedCamera = this._cameras[id]
    }
    else {
      this._selectedCamera = null
    }
    return this.selectedCamera
  }

  public get selectedCamera (): Camera {
    return { ...this._selectedCamera }
  }

  public get cameras () {
    return Object.keys(this._cameras).map(k => ({ ...this._cameras[k] }))
  }
}

export default VideoManagementSystemService
