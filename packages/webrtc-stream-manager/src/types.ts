// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

export type PlaybackDetails = Record<string, unknown>;

export type StreamHandler = (stream: MediaStream) => unknown;

export type BufferHandler = (buffer: Uint8Array) => unknown;

interface IceCandidate {
    ice: RTCIceCandidate;
}

export interface SdpInit {
    sdp: RTCSessionDescriptionInit;
}

export interface IceInit {
    ice: RTCIceCandidateInit;
}

export interface MimeInit {
    mime: string;
}

export interface ErrorMsg {
    error: unknown;
}

export type SignalingMessage = SdpInit | IceInit | MimeInit | IceCandidate | ErrorMsg;

export enum ConnectionError {
    websocket = 'websocket',
    authorization = 'authorization',
    lostConnection = 'lostConnection',
    transcodingDisabled = 'transcodingDisabled',
    mjpegDisabled = 'mjpegDisabled',
}

export enum StreamQuality {
    high = 'high',
    low = 'low'
}

export type StreamQualityStrings = `${StreamQuality}`

export enum RTCStatReportTypes {
    inboundRtp = 'inbound-rtp',
    candidatePair = 'candidate-pair',
}

export interface InboundRtpReport {
    "id": string,
    "timestamp": number,
    "type": RTCStatReportTypes.inboundRtp,
    "ssrc": number,
    "kind": "video",
    "transportId": "T01",
    "codecId": string,
    "mediaType": "video",
    "jitter": number,
    "packetsLost": 0,
    "trackIdentifier": string,
    "mid": "0",
    "packetsReceived": number,
    "bytesReceived": number,
    "headerBytesReceived": number,
    "lastPacketReceivedTimestamp": number,
    "jitterBufferDelay": number,
    "jitterBufferEmittedCount": number,
    "framesReceived": number,
    "frameWidth": number,
    "frameHeight": number,
    "framesPerSecond": number,
    "framesDecoded": number,
    "keyFramesDecoded": number,
    "framesDropped": number,
    "totalDecodeTime": number,
    "totalProcessingDelay": number,
    "totalAssemblyTime": number,
    "framesAssembledFromMultiplePackets": number,
    "totalInterFrameDelay": number,
    "totalSquaredInterFrameDelay": number,
    "pauseCount": number,
    "totalPausesDuration": number,
    "freezeCount": number,
    "totalFreezesDuration": number,
    "firCount": number,
    "pliCount": number,
    "nackCount": number
}

export interface CandidatePairReport {
    "id": string,
    "timestamp": number,
    "type": RTCStatReportTypes.candidatePair,
    "transportId": string,
    "localCandidateId": string,
    "remoteCandidateId": string,
    "state": string,
    "priority": number,
    "nominated": boolean,
    "writable": boolean,
    "packetsSent": number,
    "packetsReceived": number,
    "bytesSent": number,
    "bytesReceived": number,
    "totalRoundTripTime": number,
    "currentRoundTripTime": number,
    "availableOutgoingBitrate": number,
    "requestsReceived": number,
    "requestsSent": number,
    "responsesReceived": number,
    "responsesSent": number,
    "consentRequestsSent": number,
    "packetsDiscardedOnSend": number,
    "bytesDiscardedOnSend": number,
    "lastPacketReceivedTimestamp": number,
    "lastPacketSentTimestamp": number
}

type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>

export type IntRange<F extends number, T extends number> = Exclude<Enumerate<T>, Enumerate<F>>

export enum AvailableStreams {
    PRIMARY=0,
    SECONDARY=1,
}

export enum ApiVersions {
    v1 = 'v1',
    v2 = 'v2',
}

export enum RequiresTranscoding {
    H265=173,
    MJPEG=7,
}

export const isRequiresTranscoding = (codec: string | number): codec is RequiresTranscoding => typeof codec === 'number' && Object.values(RequiresTranscoding).includes(codec);


export interface Stream {
    codec: number,
    encoderIndex: AvailableStreams
}

export type WebRtcUrlFactory = (params?: Record<string, unknown>) => string;

export enum TargetStream {
    AUTO = 'AUTO',
    HIGH = 'HIGH',
    LOW = 'LOW',
}

export interface WebRtcUrlConfigUnknown {
    systemId: string;
    cameraId: string;
    accessToken: string;
    targetStream: TargetStream;
    position?: never;
}

export interface WebRtcUrlConfigV1 extends WebRtcUrlConfigUnknown {
    serverId?: string;
    allowTranscoding?: boolean;
    apiVersion: ApiVersions.v1;
}

export interface WebRtcUrlConfigV2 extends WebRtcUrlConfigUnknown {
    apiVersion: ApiVersions.v2;
}

export type WebRtcUrlConfig = WebRtcUrlConfigV1 | WebRtcUrlConfigV2 | WebRtcUrlConfigUnknown

export type WebRtcUrlFactoryOrConfig = WebRtcUrlFactory | WebRtcUrlConfig
