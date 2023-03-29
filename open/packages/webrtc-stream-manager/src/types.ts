export type PlaybackDetails = Record<string, { fps: number; players: number; }>;

export type StreamHandler = (stream: MediaStream) => unknown;

interface IceCandidate {
    ice: RTCIceCandidate;
}

export interface SdpInit {
    sdp: RTCSessionDescriptionInit;
}

export interface IceInit {
    ice: RTCIceCandidateInit;
}

export interface ErrorMsg {
    error: unknown;
}

export type SignalingMessage = SdpInit | IceInit | IceCandidate | ErrorMsg;

export enum ConnectionError {
    websocket = 'websocket',
    authorization = 'authorization'
}
