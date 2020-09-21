import { ICamera, CAMERA_STATUS } from './ICamera'


export class Camera implements ICamera {
  constructor (
    public readonly id: string,
    public readonly preferredServerId: string,
    public readonly name: string,
    public readonly url: string,
    public readonly status: CAMERA_STATUS,
    public readonly hasArchive: boolean,
    public readonly thumbnailUrl: string | undefined = undefined,
  ) {
  }

  public get isLive () {
    return this.status === 'Live' || this.status === 'Recording'
  }

  public get isOnline () {
    return this.status !== 'Offline'
  }

  public get isRecording () {
    return this.status === 'Recording'
  }

  public get isAuthorized () {
    return this.status !== 'Unauthorized'
  }
}

export default Camera
