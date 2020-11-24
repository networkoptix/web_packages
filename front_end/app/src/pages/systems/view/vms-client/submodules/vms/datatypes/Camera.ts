import { ms } from '../../../utils/type-aliases'
import { ICamera, ISimpleTimeRange, CAMERA_STATUS, CameraArchive } from './ICamera'
import BirdViewTree from './BirdViewTree'


export class Camera implements ICamera {

  protected _birdViewTree: BirdViewTree

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
    protected _archiveRange: ISimpleTimeRange,
    protected _archive: CameraArchive = [],
    public readonly thumbnailUrl: string | undefined = undefined,
    public liveVideoUrl: string,
    public getArchiveVideoUrl: (t: ms) => string,
  ) {
    this._initBirdView()
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

export default Camera
