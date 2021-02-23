import { ms, int } from '../../../utils/type-aliases'
import { ICamera, ISimpleTimeRange, CAMERA_STATUS, CameraArchive } from './ICamera'
import BirdViewTree from './BirdViewTree'


interface NameValue {
  name: string,
  value: string,
}

type MediaStreamInfo = any // TODO!

export class Camera implements ICamera {

  protected _birdViewTree: BirdViewTree

  public get archiveRange () {
    return this._archiveRange
  }

  public get archive () {
    return this._archive
  }

  protected _mediaStreams: Array<MediaStreamInfo> = []

  protected _rotation: int = 0

  constructor (
    public readonly id: string,
    public readonly preferredServerId: string,
    public readonly name: string,
    public readonly url: string,
    public readonly status: CAMERA_STATUS,
    public readonly isScheduleEnabled: boolean,
    protected _archiveRange: ISimpleTimeRange,
    protected _archive: CameraArchive = [],
    public readonly thumbnailUrl: string | undefined = undefined,
    public readonly getLiveVideoUrl: (quality: string) => string,
    public readonly getArchiveVideoUrl: (t: ms, quality: string) => string,
    public readonly getPosterUrl: (t?: ms) => string,
  ) {
    this._initBirdView()
  }

  public parseAdditionalParams (ps: Array<NameValue>) {
    const ms = ps.find(p => p.name === 'mediaStreams')
    if (ms) {
      try {
        this._mediaStreams = JSON.parse(ms.value).streams
        // console.log('parsed media streams', this.id, this._mediaStreams, this.hasHlsStream, this.hasLowQualityHlsStream, this.hasHighQualityHlsStream)
      } catch (e) {
        this._mediaStreams = []
        console.error('error parsing media streams', this.id, e)
      }
    }
    const rotation = ps.find(p => p.name === 'rotation')
    if (rotation) {
      this._rotation = parseInt(rotation.value) || 0
      // console.log('got camera rotation', this._rotation)
    }
  }

  public get rotation () {
    return this._rotation
  }

  public get hasHlsStream (): boolean {
    return !!this._mediaStreams.find(s => s.transports.find(t => t === 'hls'))
  }

  public get hasLowQualityHlsStream (): boolean {
    if (!this.hasHlsStream) return false
    return !!this._mediaStreams.find(s => s.transports.find(t => t === 'hls') && this._resolutionIsLow(s.resolution))
  }

  public get hasHighQualityHlsStream (): boolean {
    if (!this.hasHlsStream) return false
    return !!this._mediaStreams.find(s => s.transports.find(t => t === 'hls') && !this._resolutionIsLow(s.resolution))
  }

  protected _resolutionIsLow(s: string): boolean {
    return s.split('x').map(r => parseInt(r)).reduce((acc, v) => acc > v ? acc = v : acc, Infinity) < 1000
  }

  public get isLive () {
    return this.status === 'Live' || this.status === 'Recording'
  }

  public get isOnline () {
    return this.status !== 'Offline'
  }

  public get isOffline () {
    return this.status === 'Offline'
  }

  public get isRecording () {
    return this.status === 'Recording'
  }

  public get isAuthorized () {
    return this.status !== 'Unauthorized'
  }

  public get isUnauthorized () {
    return this.status === 'Unauthorized'
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
