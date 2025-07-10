// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { WebRTCStreamManager } from "./web-rtc-stream-manager";

export type PlaybackDetails = Record<string, unknown>;

export type StreamHandler = (stream: MediaStream) => unknown;

export type BufferHandler = (buffer: ArrayBuffer) => unknown;

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
    proxyDisabled = 'proxyDisabled',
    transcodingDisabled = 'transcodingDisabled',
    mjpegDisabled = 'mjpegDisabled',
    invalidAccessToken = 'invalidAccessToken'
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

export type WebRtcUrlFactory = (params?: Partial<ReturnType<WebRTCStreamManager['getCurrentStreamInfo']>>) => string;

export enum TargetStream {
    AUTO = 'AUTO',
    HIGH = 'HIGH',
    LOW = 'LOW',
}

export interface WebRtcUrlConfigUnknown {
    systemId: string;
    cameraId: string;
    serverId?: string;
    accessToken: string | (() => string);
    targetStream: TargetStream;
    position?:  number;
    speed?: 'unlimited' | number;
}

export interface WebRtcUrlConfigV1 extends WebRtcUrlConfigUnknown {
    allowTranscoding?: boolean;
    apiVersion: ApiVersions.v1;
}

export interface WebRtcUrlConfigV2 extends WebRtcUrlConfigUnknown {
    apiVersion: ApiVersions.v2;
}

export type WebRtcUrlConfig = WebRtcUrlConfigV1 | WebRtcUrlConfigV2 | WebRtcUrlConfigUnknown

export type WebRtcUrlFactoryOrConfig = WebRtcUrlFactory | WebRtcUrlConfig

export interface TimeStampMessage {
    timestamp: number;
    rtpTimestamp: number;
}

export interface StreamChangeMessage {
    timestamp: -1;
    status: 301
}

export const isTimeStampMessage = (message: unknown): message is TimeStampMessage => typeof message === 'object' && ['timestampMs', 'rtpTimestamp'].every(key => key in message && typeof (message as Record<string, unknown>)[key] === 'number');

const confirmationMessage = {
    timestamp: -1,
    status: 200
} as const

export const isStreamChangeMessage = (message: unknown): message is StreamChangeMessage => typeof message === 'object' &&  'status' in message && message.status === 301;

export const isConfirmationMessage = (message: unknown): message is typeof confirmationMessage => typeof message === 'object' &&  'status' in message && message.status === confirmationMessage.status;

export type DataChannelMessage = TimeStampMessage;

export interface ConnectionType {
    usingRelay: boolean,
    localAddress: string,
    remoteAddress: string,
    localCandidateType: RTCIceCandidateType,
    remoteCandidateType: RTCIceCandidateType,
}
