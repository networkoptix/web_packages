import { ms } from "../../../utils/type-aliases"

export type CAMERA_STATUS = 'Live' | 'Archive' | 'Recording' | 'Offline' | 'Unauthorized'

export interface ISimpleTimeRange {
  start: ms,
  end: ms,
  duration: ms,
  clone (): SimpleTimeRange,
  contains (r: SimpleTimeRange): boolean,
  isContained (r: SimpleTimeRange): boolean,
  isDisjointWith (r: SimpleTimeRange): boolean,
  overlapsWith (r: SimpleTimeRange): boolean,
}

export type IRecord = ISimpleTimeRange

export class SimpleTimeRange {
  constructor (
    public readonly start: ms,
    public readonly end: ms,
  ) {
  }

  public get duration (): ms {
    return this.end - this.start
  }

  public clone (): SimpleTimeRange {
    return new SimpleTimeRange(this.start, this.end)
  }

  public static fromISTR (tr: ISimpleTimeRange): SimpleTimeRange {
      return new SimpleTimeRange(tr.start, tr.end)
  }

  public contains (r: SimpleTimeRange): boolean {
      return (this.start <= r.start && this.end >= r.end)
  }

  public isContained (r: SimpleTimeRange): boolean {
      return r.contains(this)
  }

  public isDisjointWith (r: SimpleTimeRange): boolean {
      return this.start > r.end || this.end < r.start
  }

  public overlapsWith (r: SimpleTimeRange): boolean {
      return !this.isDisjointWith(r)
  }
}

export type CameraArchive = Array<IRecord>

export interface ICamera {
  id: string,
  name: string,
  url: string,
  status: CAMERA_STATUS,
  isOnline: boolean,
  isRecording: boolean,
  isLive: boolean,
  isAuthorized: boolean,


  hasArchive: boolean,
  archiveRange: ISimpleTimeRange,
  archive: CameraArchive,

  thumbnailUrl: string,
  liveVideoUrl: string,

  getArchiveVideoUrl (t: ms),
  getRecords (startMs: ms, endMs: ms, minGapMs: ms): Array<IRecord>
}

export default ICamera
