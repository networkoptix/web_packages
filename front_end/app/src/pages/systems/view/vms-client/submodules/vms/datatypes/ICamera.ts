export type CAMERA_STATUS = 'Live' | 'Archive' | 'Recording' | 'Offline' | 'Unauthorized'


export interface ICamera {
  id: string,
  name: string,
  status: CAMERA_STATUS,
  isOnline: boolean,
  isRecording: boolean,
  isLive: boolean,
  isAuthorized: boolean,
  hasArchive: boolean,
}

export default ICamera
