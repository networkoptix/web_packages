import { ms, int } from '../../../utils/type-aliases'
import { ICamera, ISimpleTimeRange, CAMERA_STATUS, CameraArchive } from './ICamera'
import BirdViewTree from './BirdViewTree'


export class TestCamera implements ICamera {

  protected _birdViewTree: BirdViewTree

  public readonly rotation: int = 0

  public get archiveRange () {
    return this._archiveRange
  }

  public get archive () {
    return this._archive
  }

  constructor (
    public readonly id: string,
    public readonly preferredServerId: string,
    public readonly name: string,
    public readonly url: string,
    public readonly status: CAMERA_STATUS,
    public readonly thumbnailUrl: string | undefined = undefined,
    protected _archiveRange: ISimpleTimeRange | undefined = undefined,
    protected _archive: CameraArchive = [],
    public readonly getPosterUrl: (t?: ms) => string = undefined,
  ) {
    this._initBirdView()
  }

  public get hasHlsStream () {
    return true
  }

  public get hasLowQualityHlsStream () {
    return true
  }

  public get hasHighQualityHlsStream () {
    return true
  }

  public get hasWebStream () {
    return true
  }

  public get hasLowQualityWebmStream () {
    return true
  }

  public get hasHighQualityWebmStream () {
    return true
  }

  public get isScheduleEnabled () {
    return false
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

  public getLiveVideoUrl (transport: string, quality: string) {
    switch (transport) {
      case 'hls':
        return 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8'
      case 'webm':
      default:
        return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
    }
  }

  public getArchiveVideoUrl (t: ms, transport: string, quality: string) {
    switch (transport) {
      case 'hls':
        return 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8'
      case 'webm':
      default:
        return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    }
  }

  public getRecords (startMs: ms, endMs: ms, minGapMs: ms) {
    // console.log('========', new Date(startMs), new Date(endMs))
    return this._birdViewTree.getRecords(startMs, endMs, minGapMs)
  }

  public setRecords (range: ISimpleTimeRange, archive: CameraArchive) {
    this._archiveRange = range
    this._archive = archive
    this._initBirdView()
  }

  protected _initBirdView () {
    this._birdViewTree = new BirdViewTree(this._archiveRange, this.archive)
  }
}

export default TestCamera
