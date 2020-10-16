import { ms } from "../../../utils/type-aliases"

export type CAMERA_STATUS = 'Live' | 'Archive' | 'Recording' | 'Offline' | 'Unauthorized'

export interface ISimpleTimeRange {
  start: ms,
  end: ms,
  duration: ms,
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
