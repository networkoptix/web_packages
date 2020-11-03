import { ms } from '../../../utils/type-aliases'
import { ICamera, ISimpleTimeRange, CAMERA_STATUS, CameraArchive } from './ICamera'
import BirdViewTree from './BirdViewTree'


export class TestCamera implements ICamera {

  protected _birdViewTree: BirdViewTree

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
    this._birdViewTree = new BirdViewTree(archiveRange, this.archive)
    // console.log(this.id, 'TEST Camera birdview tree initialized', this.archive.length, this.archive.reduce(
    //   (acc, r) => {
    //       if (acc.prev) {
    //           const gap = r.start - acc.prev.end
    //           if (gap > acc.maxGap) {
    //               acc.maxGap = gap
    //           }
    //       }
    //       acc.prev = r
    //       return acc
    //   }, {
    //       prev: null,
    //       maxGap: 0
    //   }
    // ).maxGap)
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

  public getRecords (startMs: ms, endMs: ms, minGapMs: ms) {
    // console.log('========', new Date(startMs), new Date(endMs))
    return this._birdViewTree.getRecords(startMs, endMs, minGapMs)
  }
}

export default TestCamera
