import { Injectable } from '@angular/core'
import MediaServer from '../datatypes/MediaServer'
import Camera from '../datatypes/Camera'
import fakeData from '../fakeData'

@Injectable({
  providedIn: 'root',
 })
export class VideoManagementSystemService {

  protected _mediaServers: Array<MediaServer> = []

  protected _selectedCamera: Camera = null

  public cleanMediaServers () {
    this._mediaServers = []
  }

  public setFakeMediaServers () {
    this._mediaServers = fakeData
  }

  public setMediaServers (mediaServers: Array<MediaServer>) {
    this._mediaServers = mediaServers
    console.log('media servers set', mediaServers)
  }

  protected get _camerasAsFlatArray (): Array<Camera> {
    const result = []
    this._mediaServers.map(ms => ms.cameras.map(c => result.push(c)))
    return result
  }

  protected get _camerasAsDict (): Object {
    return this._camerasAsFlatArray.reduce(
      (acc, c) => {
        acc[c.id] = c
        return acc
      },
      {}
    )
  }

  public resetCameraSelection () {
    this._selectedCamera = null
  }

  public selectCamera (id: string): Camera | false {
    if (id in this._camerasAsDict) {
      this._selectedCamera = this._camerasAsDict[id]
    }
    else {
      this._selectedCamera = null
    }
    return this.selectedCamera || false
  }


  public get mediaServers () {
    return this.mediaServers
  }

  public get cameras () {
    return this._camerasAsFlatArray
  }

  public get selectedCamera (): Camera {
    return this._selectedCamera
  }
}

export default VideoManagementSystemService
