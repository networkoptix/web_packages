import { Injectable } from '@angular/core'


export type PlaybackQuality = 'auto' | 'low' | 'high'


@Injectable({
  providedIn: 'root',
 })
export class CameraQualityStorageService {

  constructor (
  ) {
  }

  // TODO: add persistency, if required
  protected _qualities = {
  }

  public get (cameraId: string) {
    return this._qualities[cameraId]
  }

  public set (cameraId: string, quality: PlaybackQuality) {
    this._qualities[cameraId] = quality
  }

}

export default CameraQualityStorageService
