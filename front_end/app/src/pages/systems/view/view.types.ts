export type MEDIA_SERVER_STATUS = 'Online' | 'Offline' | 'Unauthorized'

export interface INxViewMediaServer {
  id: string,
  name: string,
  url: string,
  cameras: Array<INxViewCamera>,
  status: MEDIA_SERVER_STATUS
}

export type CAMERA_STATUS = 'Online' | 'Offline' | 'Recording' | 'Unauthorized'

export interface INxViewCamera {
  id: string,
  name: string,
  url: string,
  status: CAMERA_STATUS
}

export type PlaybackQuality = 'auto' | 'low' | 'high' // | string ?

export type PlaybackTransport = 'hls' | 'webm' // | 'rtsp' | 'mjpeg' ?
