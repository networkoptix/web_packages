export type PlaybackQuality = 'auto' | 'low' | 'high' | string | undefined;
// any 640x480-like resolution definition works, too

export type PlaybackTransport =
    | 'hls'
    | 'webm'
    | 'mpegts'
    | 'mjpeg'
    | 'mp4'
    | 'mkv'
    | 'rtsp'
    | undefined;

export interface WebClientUxState {
    isFullScreen: boolean;
    isSidebarShown: boolean;
    isTimelineShown: boolean;
}
