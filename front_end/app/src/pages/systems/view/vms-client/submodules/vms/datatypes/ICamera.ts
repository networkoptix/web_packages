import { ms } from "../../../utils/type-aliases"

export type CAMERA_STATUS = 'Live' | 'Archive' | 'Recording' | 'Offline' | 'Unauthorized'

export interface ISimpleTimeRange {
  start: ms,
  end: ms
}

export interface ICamera {
  id: string,
  name: string,
  status: CAMERA_STATUS,
  isOnline: boolean,
  isRecording: boolean,
  isLive: boolean,
  isAuthorized: boolean,


  archiveRange: ISimpleTimeRange,
  hasArchive: boolean,

  thumbnailUrl: string,
  liveVideoUrl: string,

  getArchiveVideoUrl (t: ms),
}

export default ICamera
