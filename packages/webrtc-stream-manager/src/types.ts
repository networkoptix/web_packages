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

/**
 * Pre-resolved connection context. When provided, skips host resolution/ping request.
 */
export interface ConnectionContext {
    /** The resolved host URL after following redirects from ping */
    resolvedHost: string;
    /** The moduleGuid returned from ping response (which server the relay connected to) */
    moduleGuid?: string;
}

/**
 * Pre-resolved API context. When provided, skips version detection request.
 */
export interface ApiContext {
    /** API version to use for endpoint construction. Skips GET /rest/v2/system/info */
    version: ApiVersions;
    /**
     * One-time token for V2 API WebSocket authentication.
     * Can be a static string or a factory function (recommended for fresh tokens).
     * Note: Tokens expire in ~10 seconds and are single-use - prefer factory function.
     */
    oneTimeToken?: string | (() => string | Promise<string>);
}

export interface WebRtcUrlConfigUnknown {
    systemId: string;
    cameraId: string;
    serverId?: string;
    accessToken: string | (() => string | Promise<string>);
    targetStream: TargetStream;
    position?:  number;
    speed?: 'unlimited' | number;
    /** Available streams from camera mediaStreams data. If provided, skips API detection. */
    availableStreams?: AvailableStreams[];
    /** Full mediaStreams data from camera. If provided, skips device info API call. */
    mediaStreams?: Stream[];

    // === Pre-resolution context (NEW) ===

    /**
     * Pre-resolved connection context. When provided, skips ping/host resolution request.
     * Use this when the caller has already determined the relay connection details.
     */
    connectionContext?: ConnectionContext;

    /**
     * Pre-resolved API context. When provided, skips version detection request.
     * Use this when the system version is already known from NxSystemInfo.
     */
    apiContext?: ApiContext;

    /**
     * Explicit proxy mode override.
     * - true: Force proxy mode (route through relay-connected server)
     * - false: Force direct connection to target server
     * - undefined: Auto-detect by comparing moduleGuid with serverId
     *
     * Note: Proxy is needed when target server is different from relay-connected server,
     * to avoid unnecessary inter-server video traffic routing.
     */
    useProxy?: boolean;
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

export type TimeStampMessage = (
    { timestamp: number } | { timestampMs: number }
) & { rtpTimestamp: number };

export interface StreamChangeMessage {
    timestamp: -1;
    status: 301
}

export const isTimeStampMessage = (message: unknown): message is TimeStampMessage => {
    if (typeof message !== 'object' || message === null) return false;
    const m = message as Record<string, unknown>;
    const hasRtp = typeof m['rtpTimestamp'] === 'number';
    const hasTimestamp = typeof m['timestamp'] === 'number';
    const hasTimestampMs = typeof m['timestampMs'] === 'number';
    return hasRtp && (hasTimestamp || hasTimestampMs);
}

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
