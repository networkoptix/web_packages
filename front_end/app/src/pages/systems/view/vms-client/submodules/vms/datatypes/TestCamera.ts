import { ms } from '../../../utils/type-aliases'
import { ICamera, ISimpleTimeRange, CAMERA_STATUS, CameraArchive } from './ICamera'

export class TestCamera implements ICamera {
  constructor (
    public readonly id: string,
    public readonly preferredServerId: string,
    public readonly name: string,
    public readonly url: string,
    public readonly status: CAMERA_STATUS,
    public readonly thumbnailUrl: string | undefined = undefined,
    public readonly archiveRange: ISimpleTimeRange | undefined = undefined,
    public readonly archive: CameraArchive = [],
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

  public get liveVideoUrl () {
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
  }

  public getArchiveVideoUrl (t: ms) {
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  }
}

export default TestCamera
