import { ms } from '../../../utils/type-aliases'
import { ICamera, ISimpleTimeRange, CAMERA_STATUS, CameraArchive } from './ICamera'


export class Camera implements ICamera {
  constructor (
    public readonly id: string,
    public readonly preferredServerId: string,
    public readonly name: string,
    public readonly url: string,
    public readonly status: CAMERA_STATUS,
    public readonly archiveRange: ISimpleTimeRange,
    public readonly archive: CameraArchive = [],
    public readonly thumbnailUrl: string | undefined = undefined,
    public liveVideoUrl: string,
    public getArchiveVideoUrl: (t: ms) => string,
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

  public get hasArchive () {
    return !!(this.archiveRange && this.archiveRange.end > this.archiveRange.start)
  }
}

export default Camera
