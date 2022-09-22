export type MEDIA_SERVER_STATUS = 'Online' | 'Offline' | 'Unauthorized';

export interface INxViewMediaServer {
    id: string,
    name: string,
    url: string,
    cameras: Array<INxViewCamera>,
    status: MEDIA_SERVER_STATUS
}

export type CAMERA_STATUS = 'Online' | 'Offline' | 'Recording' | 'Unauthorized';

export interface INxViewCamera {
    id: string,
    name: string,
    url: string,
    status: CAMERA_STATUS
}

export type PlaybackQuality = 'auto' | 'low' | 'high' | string;
// any 640x480-like resolution definition works, too

export type PlaybackTransport = 'hls' | 'webm' | 'mpegts' | 'mjpeg' | 'mp4' | 'mkv' | 'rtsp';

export interface WebClientUxState {
    isFullScreen: boolean,
    isSidebarShown: boolean,
    isTimelineShown: boolean,
}
