// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

// ─── Logger ──────────────────────────────────────────────────────────────────

/** Minimal logging interface. Compatible with `console` but allows custom loggers. */
export interface Logger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ConnectionError {
  websocket = 'websocket',
  authorization = 'authorization',
  lostConnection = 'lostConnection',
  proxyDisabled = 'proxyDisabled',
  transcodingDisabled = 'transcodingDisabled',
  mjpegDisabled = 'mjpegDisabled',
  invalidAccessToken = 'invalidAccessToken',
  transcodingRequired = 'transcodingRequired',
}

/** Delivery method for the WebRTC media transport. */
export type DeliveryMethod = 'srtp' | 'mse';

export enum AvailableStreams {
  PRIMARY = 0,
  SECONDARY = 1,
}

export enum ApiVersions {
  v1 = 'v1',
  v2 = 'v2',
}

export enum TargetStream {
  AUTO = 'AUTO',
  HIGH = 'HIGH',
  LOW = 'LOW',
}

export enum RequiresTranscoding {
  MJPEG = 7,
}

/** Well-known codec identifiers from the mediaserver Stream.codec field. */
export const KnownCodec = {
  H264: 27,
  H265: 173,
  MJPEG: 7,
} as const;

/**
 * Returns true if the codec can be delivered over WebRTC SRTP without transcoding.
 * Only H264 and H265 are natively supported — anything else (MJPEG, etc.) forces
 * the mediaserver to transcode, typically to VP8.
 */
export function isNativeWebRtcCodec(codec: number): boolean {
  return codec === KnownCodec.H264 || codec === KnownCodec.H265;
}

/** Peer connection lifecycle states (new in v2). */
export enum PeerState {
  connecting = 'connecting',
  connected = 'connected',
  failed = 'failed',
}

// ─── Signaling interfaces ────────────────────────────────────────────────────

export interface SdpInit {
  sdp: RTCSessionDescriptionInit;
}

export interface IceInit {
  ice: RTCIceCandidateInit;
}

export interface MimeInit {
  mime: string;
}

export interface TranscodingInit {
  transcoding: { video: boolean; audio?: boolean };
}

export interface ErrorMsg {
  error: unknown;
}

export type SignalingMessage =
  | SdpInit
  | IceInit
  | MimeInit
  | TranscodingInit
  | ErrorMsg;

// ─── Stream & config interfaces ──────────────────────────────────────────────

export interface Stream {
  codec: number;
  encoderIndex: AvailableStreams;
}

/**
 * Pre-resolved connection context. When provided, skips host resolution/ping request.
 */
export interface ConnectionContext {
  /** The resolved host URL after following redirects from ping. */
  resolvedHost: string;
  /** The moduleGuid returned from ping response (which server the relay connected to). */
  moduleGuid?: string;
}

/**
 * Pre-resolved API context. When provided, skips version detection request.
 */
export interface ApiContext {
  /** API version to use for endpoint construction. Skips GET /rest/v2/system/info. */
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
  position?: number;
  speed?: 'unlimited' | number;
  /** Available streams from camera mediaStreams data. If provided, skips API detection. */
  availableStreams?: AvailableStreams[];
  /** Full mediaStreams data from camera. If provided, skips device info API call. */
  mediaStreams?: Stream[];

  // === Pre-resolution context ===

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

export type WebRtcUrlConfig =
  | WebRtcUrlConfigV1
  | WebRtcUrlConfigV2
  | WebRtcUrlConfigUnknown;

// ─── Data-channel messages ───────────────────────────────────────────────────

export type TimeStampMessage = (
  | { timestamp: number }
  | { timestampMs: number }
) & { rtpTimestamp: number };

export interface StreamChangeMessage {
  timestamp: -1;
  status: 301;
}

/** @deprecated Use TimeStampMessage directly. This alias will be removed in a future version. */
export type DataChannelMessage = TimeStampMessage;

// ─── Type guards ─────────────────────────────────────────────────────────────

export const isRequiresTranscoding = (
  codec: string | number,
): codec is RequiresTranscoding =>
  typeof codec === 'number' &&
  Object.values(RequiresTranscoding).includes(codec);

export const isTimeStampMessage = (
  message: unknown,
): message is TimeStampMessage => {
  if (typeof message !== 'object' || message === null) return false;
  const m = message as Record<string, unknown>;
  const hasRtp = typeof m['rtpTimestamp'] === 'number';
  const hasTimestamp = typeof m['timestamp'] === 'number';
  const hasTimestampMs = typeof m['timestampMs'] === 'number';
  return hasRtp && (hasTimestamp || hasTimestampMs);
};

const confirmationMessage = {
  timestamp: -1,
  status: 200,
} as const;

export const isConfirmationMessage = (
  message: unknown,
): message is typeof confirmationMessage =>
  typeof message === 'object' &&
  message !== null &&
  'status' in message &&
  message.status === confirmationMessage.status;

export const isStreamChangeMessage = (
  message: unknown,
): message is StreamChangeMessage =>
  typeof message === 'object' &&
  message !== null &&
  'status' in message &&
  message.status === 301;

export const isTranscodingMessage = (
  message: unknown,
): message is TranscodingInit =>
  typeof message === 'object' &&
  message !== null &&
  'transcoding' in message &&
  typeof (message as TranscodingInit).transcoding === 'object' &&
  (message as TranscodingInit).transcoding !== null &&
  typeof (message as TranscodingInit).transcoding.video === 'boolean';

export const isMimeInit = (message: unknown): message is MimeInit =>
  typeof message === 'object' &&
  message !== null &&
  'mime' in message &&
  typeof (message as MimeInit).mime === 'string';

// ─── Connection type ─────────────────────────────────────────────────────────

export interface ConnectionType {
  usingRelay: boolean;
  localAddress: string;
  remoteAddress: string;
  localCandidateType: RTCIceCandidateType;
  remoteCandidateType: RTCIceCandidateType;
}

// ─── v2 event detail interfaces ──────────────────────────────────────────────

/** Detail for the track event emitted when a remote media track is received. */
export interface TrackEventDetail {
  track: MediaStreamTrack;
  streams: readonly MediaStream[];
}

/** Detail for timestamp events parsed from the data channel. */
export interface TimestampEventDetail {
  /** Seconds-based timestamp (from `timestamp` field) or `undefined` if only `timestampMs` was present. */
  timestamp?: number;
  /** Milliseconds-based timestamp (from `timestampMs` field) or `undefined` if only `timestamp` was present. */
  timestampMs?: number;
  rtpTimestamp: number;
}

/** Detail for peer connection state change events. */
export interface StateChangeEventDetail {
  state: PeerState;
  previousState: PeerState | null;
}

/** Detail for stream-change events (server-initiated stream switch). */
export interface StreamChangeEventDetail {
  stream: AvailableStreams;
}

/** Detail for transcoding events (server signals transcoding is active). */
export interface TranscodingEventDetail {
  video: boolean;
  audio?: boolean;
}

/** Detail for delivery method events (server provides MSE mime type). */
export interface DeliveryMethodEventDetail {
  method: DeliveryMethod;
  mime?: string;
}

// ─── Analytics metadata types ────────────────────────────────────────────────

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** @deprecated Use BBox instead */
export type BoundingBox = BBox;

/** A key-value attribute attached to an analytics object. */
export interface ObjectAttribute {
  name: string;
  value: string;
}

/** A single detected object within an analytics metadata packet. */
export interface ObjectMetadata {
  typeId: string;
  trackId: string;
  confidence?: number; // NOTE: optional — server C++ ObjectMetadata has no confidence
  boundingBox: BBox;
  attributes?: ObjectAttribute[];
}

/** The analytics metadata packet received on the data channel. */
export interface ObjectMetadataPacket {
  deviceId: string;
  timestampUs: number;
  durationUs?: number;
  streamIndex?: string; // "primary" | "secondary" — string on the wire
  analyticsEngineId?: string;
  objectMetadataList: ObjectMetadata[];
}

/** The top-level envelope for a metadata data-channel message. */
export interface MetadataMessage {
  metadata: ObjectMetadataPacket;
}

/** Detail for analytics metadata events from the data channel. */
export interface MetadataEventDetail {
  metadata: ObjectMetadataPacket;
}

export const isMetadataMessage = (message: unknown): message is MetadataMessage =>
  typeof message === 'object' &&
  message !== null &&
  'metadata' in message &&
  typeof (message as MetadataMessage).metadata === 'object' &&
  (message as MetadataMessage).metadata !== null &&
  Array.isArray((message as MetadataMessage).metadata.objectMetadataList);
