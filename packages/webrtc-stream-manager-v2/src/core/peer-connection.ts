// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Disposable } from './disposable';
import { SignalingChannel } from './signaling';
import { diagTracker } from '../utils/diag-tracker';
import {
  AvailableStreams,
  PeerState,
  isTimeStampMessage,
  isConfirmationMessage,
  isStreamChangeMessage,
  isTranscodingMessage,
  isMimeInit,
  isMetadataMessage,
  type SdpInit,
  type IceInit,
  type Logger,
  type TrackEventDetail,
  type TimestampEventDetail,
  type StateChangeEventDetail,
  type StreamChangeEventDetail,
  type TranscodingEventDetail,
  type DeliveryMethodEventDetail,
  type MetadataEventDetail,
} from '../types';

// ─── Signaling type guards ──────────────────────────────────────────────────

function isSdpInit(msg: unknown): msg is SdpInit {
  return typeof msg === 'object' && msg !== null && 'sdp' in msg;
}

function isIceInit(msg: unknown): msg is IceInit {
  return typeof msg === 'object' && msg !== null && 'ice' in msg;
}

// ─── Config & event types ───────────────────────────────────────────────────

export interface PeerConnectionConfig {
  signalingUrl: string;
  iceServers?: RTCIceServer[];
  parentSignal?: AbortSignal;
  /**
   * Optional logger for diagnostic lifecycle traces (`info`) and protocol
   * errors. When omitted, all diagnostic output is suppressed — pass
   * `console` (or any {@link Logger}) from the consumer to enable.
   */
  logger?: Logger;
}

/** Maps event names to their listener payload types. */
interface PeerConnectionEventMap {
  track: TrackEventDetail;
  timestamp: TimestampEventDetail;
  confirmation: undefined;
  streamchange: StreamChangeEventDetail;
  statechange: StateChangeEventDetail;
  buffer: ArrayBuffer;
  transcoding: TranscodingEventDetail;
  deliverymethod: DeliveryMethodEventDetail;
  metadata: MetadataEventDetail;
  /** Raw data channel message (string or ArrayBuffer). Fired for every message. */
  datachannel: string | ArrayBuffer;
  /** Fires once the data channel is open and ready for `send`. */
  dcopen: undefined;
}

type PeerConnectionEvent = keyof PeerConnectionEventMap;

// ─── PeerConnectionWrapper ──────────────────────────────────────────────────

/**
 * Wraps a single RTCPeerConnection + WebSocket signaling + data channel.
 *
 * Responsibilities:
 * - SDP offer/answer and ICE candidate exchange via {@link SignalingChannel}
 * - Emitting typed events for tracks, data-channel messages, and state changes
 * - Sending stream-switch and seek commands over the data channel
 *
 * This class does **not** handle retry logic — that is the responsibility of
 * the parent {@link CameraConnection}.
 */
export class PeerConnectionWrapper extends Disposable {
  private readonly pc: RTCPeerConnection;
  private readonly signaling: SignalingChannel;
  private readonly emitter = new EventTarget();

  private dataChannel: RTCDataChannel | null = null;
  private dataChannelMessageHandler:
    | ((event: MessageEvent) => void)
    | null = null;

  private _state: PeerState = PeerState.connecting;
  private lastRequestedStream: AvailableStreams = AvailableStreams.PRIMARY;
  private _activeStream: MediaStream | null = null;
  private _deliveryMethodDetail: DeliveryMethodEventDetail | null = null;
  private _transcodingDetail: TranscodingEventDetail | null = null;

  /** Current peer connection lifecycle state. */
  get state(): PeerState {
    return this._state;
  }

  /** Whether the data channel is open and ready for `send`. */
  get dataChannelOpen(): boolean {
    return this.dataChannel?.readyState === 'open';
  }

  /**
   * The most recently received remote media stream.
   * Available after the `ontrack` event fires during SDP negotiation.
   * This allows callers to retrieve the stream even if they register
   * their `track` listener after the event has already fired.
   */
  get activeStream(): MediaStream | null {
    return this._activeStream;
  }

  /**
   * The delivery method details received during signaling.
   * Stored so callers who register after signaling can still retrieve
   * the MIME type needed to initialize MSE playback.
   */
  get deliveryMethod(): DeliveryMethodEventDetail | null {
    return this._deliveryMethodDetail;
  }

  /**
   * The transcoding details received during signaling.
   * Stored so callers who register after the ICE connection is established
   * can still check whether the server is transcoding this stream.
   */
  get transcoding(): TranscodingEventDetail | null {
    return this._transcodingDetail;
  }

  /** @internal Diagnostic label for this peer connection instance. */
  private readonly _diagLabel: string;
  private readonly _diagStart: number;
  /** @internal Connection key for diag tracker. */
  private readonly _diagConnectionKey: string;
  /** @internal Optional logger; off by default (consumer opts in). */
  private readonly logger?: Logger;

  constructor(config: PeerConnectionConfig) {
    super();
    this.logger = config.logger;
    this._diagStart = performance.now();
    // Extract a short identifier from the signaling URL (camera ID portion)
    const _diagUrlShort = config.signalingUrl.replace(/.*\/devices\//, '').replace(/\/webrtc.*/, '').slice(0, 12);
    this._diagLabel = `[WEBRTC-DIAG] [pc:${_diagUrlShort}]`;
    this._diagConnectionKey = this.extractConnectionKey(config.signalingUrl);
    this.logger?.info?.(`${this._diagLabel} PeerConnectionWrapper constructor`, { signalingUrl: config.signalingUrl, t: this._diagStart });

    // 1. Create RTCPeerConnection
    this.pc = new RTCPeerConnection(
      config.iceServers ? { iceServers: config.iceServers } : undefined,
    );
    this.logger?.info?.(`${this._diagLabel} RTCPeerConnection created`, { elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });

    // 2. Create SignalingChannel linked to our disposal signal
    this.signaling = new SignalingChannel(config.signalingUrl, this.signal, this.logger);
    this.logger?.info?.(`${this._diagLabel} SignalingChannel (WebSocket) created`, { elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });

    // 3. Subscribe to signaling messages (SDP offers, ICE candidates)
    this.signaling.on('message', (data) => this.handleSignalingMessage(data));

    // 3a. Fast-fail on signaling errors: if the WebSocket fails before ICE
    //     connects, transition to failed immediately instead of waiting for
    //     the ICE timeout (10-30+ seconds).
    this.signaling.on('error', () => {
      if (this._state !== PeerState.connected) {
        this.updateState(PeerState.failed);
      }
    });
    this.signaling.on('close', () => {
      if (this._state !== PeerState.connected) {
        this.updateState(PeerState.failed);
      }
    });

    // 4. Forward local ICE candidates to the remote peer via signaling
    this.pc.onicecandidate = (event) => {
      if (event.candidate && !this.disposed && !this.signaling.disposed) {
        this.signaling.send({ ice: event.candidate });
      }
    };

    // 5. Map ICE connection state changes to PeerState
    this.pc.oniceconnectionstatechange = () => this.handleIceStateChange();

    // Aggregate connectionState catches hard failures the ICE handler alone may miss.
    this.pc.onconnectionstatechange = () => this.handleConnectionStateChange();

    // 6. Re-emit remote tracks and store the active stream
    this.pc.ontrack = (event) => {
      this.logger?.info?.(`${this._diagLabel} ontrack received`, { kind: event.track.kind, trackId: event.track.id, elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });
      this._activeStream = event.streams[0] ?? null;

      // Diag: record first track milestone
      diagTracker.milestone(this._diagConnectionKey, 'firstTrackMs', { kind: event.track.kind });

      // Diag: track first frame (unmute = first actual video frame)
      if (event.track.kind === 'video') {
        const connKey = this._diagConnectionKey;
        if (!event.track.muted) {
          // Track already has frames
          diagTracker.recordFirstFrame(connKey, this.logger);
        } else {
          event.track.addEventListener('unmute', () => {
            diagTracker.recordFirstFrame(connKey, this.logger);
          }, { once: true });
        }
      }

      this.emit('track', {
        track: event.track,
        streams: event.streams,
      });
    };

    // 7. Accept the server-created data channel
    this.pc.ondatachannel = (event) => this.setupDataChannel(event.channel);

    // 8. Register disposal cleanup
    this.onDispose(() => {
      this.cleanupDataChannel();
      this.stopSenderTracks();
      this.pc.close();
    });

    // 9. Link to optional parent signal so external abort cascades disposal
    if (config.parentSignal) {
      this.linkTo(config.parentSignal);
    }
  }

  // ── Public event API ────────────────────────────────────────────────────

  /**
   * Register a listener for a peer connection event.
   * Returns a cleanup function that removes the listener.
   */
  on(event: 'track', listener: (detail: TrackEventDetail) => void): () => void;
  on(
    event: 'timestamp',
    listener: (detail: TimestampEventDetail) => void,
  ): () => void;
  on(event: 'confirmation', listener: () => void): () => void;
  on(
    event: 'streamchange',
    listener: (detail: StreamChangeEventDetail) => void,
  ): () => void;
  on(
    event: 'statechange',
    listener: (detail: StateChangeEventDetail) => void,
  ): () => void;
  on(event: 'buffer', listener: (data: ArrayBuffer) => void): () => void;
  on(
    event: 'transcoding',
    listener: (detail: TranscodingEventDetail) => void,
  ): () => void;
  on(
    event: 'deliverymethod',
    listener: (detail: DeliveryMethodEventDetail) => void,
  ): () => void;
  on(
    event: 'metadata',
    listener: (detail: MetadataEventDetail) => void,
  ): () => void;
  on(
    event: 'datachannel',
    listener: (data: string | ArrayBuffer) => void,
  ): () => void;
  on(event: 'dcopen', listener: () => void): () => void;
  on(
    event: PeerConnectionEvent,
    listener: (...args: never[]) => void,
  ): () => void {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      if (detail !== undefined) {
        (listener as (d: unknown) => void)(detail);
      } else {
        (listener as () => void)();
      }
    };

    this.emitter.addEventListener(event, handler);
    return () => this.emitter.removeEventListener(event, handler);
  }

  // ── Data-channel commands ───────────────────────────────────────────────

  /**
   * Request a stream switch via the data channel.
   *
   * @param stream   - `0` (primary) or `1` (secondary).
   * @param position - Playback position in milliseconds.
   * @param speed    - Playback speed or `'unlimited'` for max throughput.
   */
  sendStreamRequest(
    stream: 0 | 1,
    position: number,
    speed: number | 'unlimited',
  ): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
    this.lastRequestedStream = stream as AvailableStreams;
    this.dataChannel.send(JSON.stringify({ stream, position, speed }));
  }

  /**
   * Seek to a playback position via the data channel.
   *
   * @param positionMs - Target position in milliseconds.
   */
  sendSeek(positionMs: number): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
    // VMS webrtc_streamer.cpp only matches the "seek" key and parses the value
    // with RapidJSON's IsDouble() (not IsInt64()), so integer seek values must
    // be serialized with a decimal point to be accepted.
    const seekValue = Number.isInteger(positionMs) ? `${positionMs}.0` : `${positionMs}`;
    this.dataChannel.send(`{"seek":${seekValue}}`);
  }

  /** Send a pause command via the data channel. */
  sendPause(): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return false;
    // VMS expects a string value, not a boolean: {"pause":true} is rejected, {"pause":""} works.
    this.dataChannel.send(JSON.stringify({ pause: '' }));
    return true;
  }

  /** Send a resume command via the data channel. */
  sendResume(): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return false;
    // VMS expects a string value, not a boolean: {"resume":true} is rejected, {"resume":""} works.
    this.dataChannel.send(JSON.stringify({ resume: '' }));
    return true;
  }

  /** Advance by one frame (only meaningful when paused). */
  sendNextFrame(cameraId: string): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') return false;
    this.dataChannel.send(JSON.stringify({ nextFrame: cameraId }));
    return true;
  }

  /**
   * Expose the underlying RTCPeerConnection's stats report.
   * Used by CameraConnection.pollQuality() to feed QualityMonitor.
   */
  async getStats(): Promise<RTCStatsReport> {
    return this.pc.getStats();
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /** @internal Extract connection key from signaling URL for diag tracker. */
  private extractConnectionKey(url: string): string {
    try {
      const u = new URL(url);
      const match = u.pathname.match(/\/devices\/([^/]+)\/webrtc/);
      const cameraId = match?.[1] ?? 'unknown';
      for (const [key] of diagTracker.raw) {
        if (key.endsWith(`:${cameraId}`)) return key;
      }
      return cameraId;
    } catch {
      return 'unknown';
    }
  }

  /** Dispatch a typed event through the internal emitter. */
  private emit<K extends PeerConnectionEvent>(event: K, detail: PeerConnectionEventMap[K]): void {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail }));
  }

  /** Update lifecycle state and emit a statechange event if it changed. */
  private updateState(newState: PeerState): void {
    if (this.disposed || newState === this._state) return;
    const previousState: PeerState | null = this._state;
    this._state = newState;
    this.emit('statechange', { state: newState, previousState });
  }

  // ── Signaling ───────────────────────────────────────────────────────────

  private async handleSignalingMessage(data: unknown): Promise<void> {
    if (this.disposed) return;
    const _diagMsgStart = performance.now();

    // Transcoding notification from server (may arrive alongside SDP in
    // the same JSON message, e.g. {"transcoding":{...},"sdp":{...}}).
    // Do NOT return — the message may also contain SDP/ICE data that
    // must be processed below.
    if (isTranscodingMessage(data)) {
      this._transcodingDetail = {
        video: data.transcoding.video,
        audio: data.transcoding.audio,
      };
      this.emit('transcoding', this._transcodingDetail);
      // If the transcoding listener disposed us (e.g. createConnection
      // rejected with transcodingRequired), stop processing.
      if (this.disposed) return;
    }

    // MSE mime type from server (may arrive alongside SDP).
    // Store the detail so callers who register after signaling can replay it.
    if (isMimeInit(data)) {
      this._deliveryMethodDetail = { method: 'mse', mime: data.mime };
      this.emit('deliverymethod', this._deliveryMethodDetail);
      if (this.disposed) return;
    }

    if (isSdpInit(data)) {
      this.logger?.info?.(`${this._diagLabel} SDP offer received`, { elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });
      diagTracker.milestone(this._diagConnectionKey, 'sdpOfferMs');
      diagTracker.phaseStart(this._diagConnectionKey, 'sdpNegotiation');
      try {
        await this.pc.setRemoteDescription(data.sdp);
        if (this.disposed) return;

        const answer = await this.pc.createAnswer();
        if (this.disposed) return;

        await this.pc.setLocalDescription(answer);
        if (this.disposed) return;

        if (!this.signaling.disposed) {
          this.signaling.send({ sdp: answer });
          diagTracker.milestone(this._diagConnectionKey, 'sdpAnswerMs');
          diagTracker.phaseEnd(this._diagConnectionKey, 'sdpNegotiation');
          this.logger?.info?.(`${this._diagLabel} SDP answer sent`, { sdpNegotiationMs: (performance.now() - _diagMsgStart).toFixed(1) + 'ms', elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });
        }
      } catch {
        this.updateState(PeerState.failed);
      }
    } else if (isIceInit(data)) {
      try {
        await this.pc.addIceCandidate(data.ice);
      } catch {
        // Non-fatal: late or duplicate candidates are expected to fail
        // occasionally and do not affect the connection.
      }
    }
  }

  // ── ICE state ───────────────────────────────────────────────────────────

  private handleIceStateChange(): void {
    if (this.disposed) return;

    const iceState = this.pc.iceConnectionState;
    this.logger?.info?.(`${this._diagLabel} ICE state change: ${iceState}`, { elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });

    if (iceState === 'connected' || iceState === 'completed') {
      this.updateState(PeerState.connected);
      diagTracker.milestone(this._diagConnectionKey, 'iceConnectedMs');

      // WebSocket is no longer needed once the peer connection is live.
      if (!this.signaling.disposed) {
        this.signaling.dispose();
      }
    } else if (iceState === 'failed' || iceState === 'closed') {
      // 'disconnected' is excluded: paused playback stops media → consent timeout flips ICE to 'disconnected'.
      this.updateState(PeerState.failed);
    }
  }

  private handleConnectionStateChange(): void {
    if (this.disposed) return;
    const cs = this.pc.connectionState;
    this.logger?.info?.(`${this._diagLabel} connectionState change: ${cs}`, {
      iceConnectionState: this.pc.iceConnectionState,
      elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms',
    });
    if (cs === 'failed' || cs === 'closed') {
      this.updateState(PeerState.failed);
    }
  }

  // ── Data channel ──────────────────────────────────────────────────────

  private setupDataChannel(channel: RTCDataChannel): void {
    this.logger?.info?.(`${this._diagLabel} data channel established`, { label: channel.label, elapsed: (performance.now() - this._diagStart).toFixed(1) + 'ms' });
    this.cleanupDataChannel();

    channel.binaryType = 'arraybuffer';
    this.dataChannel = channel;

    this.dataChannelMessageHandler = (event: MessageEvent) =>
      this.handleDataChannelMessage(event);
    channel.addEventListener('message', this.dataChannelMessageHandler);

    // DC open lags ICE 'connected' on its own SCTP timeline; consumers wanting send-readiness watch this.
    if (channel.readyState === 'open') {
      this.emit('dcopen', undefined);
    } else {
      channel.addEventListener('open', () => this.emit('dcopen', undefined), { once: true });
    }
  }

  private handleDataChannelMessage(event: MessageEvent): void {
    if (this.disposed) return;

    const { data } = event;

    // Emit raw message for debugging / metadata inspection.
    this.emit('datachannel', data);

    // Binary frames are forwarded as-is.
    if (data instanceof ArrayBuffer) {
      this.emit('buffer', data);
      return;
    }

    // String payloads are parsed as JSON and dispatched by type.
    if (typeof data === 'string') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        return; // Unparsable messages are silently dropped.
      }

      if (isTimeStampMessage(parsed)) {
        const detail: TimestampEventDetail = {
          rtpTimestamp: parsed.rtpTimestamp,
        };
        // TimeStampMessage is a union — probe for optional fields.
        const raw = parsed as Record<string, unknown>;
        if (typeof raw['timestamp'] === 'number') {
          detail.timestamp = raw['timestamp'];
        }
        if (typeof raw['timestampMs'] === 'number') {
          detail.timestampMs = raw['timestampMs'];
        }
        this.emit('timestamp', detail);
      } else if (isConfirmationMessage(parsed)) {
        this.emit('confirmation', undefined);
      } else if (isStreamChangeMessage(parsed)) {
        this.emit('streamchange', {
          stream: this.lastRequestedStream,
        } satisfies StreamChangeEventDetail);
      } else if (isMetadataMessage(parsed)) {
        this.emit('metadata', {
          metadata: parsed.metadata,
        } satisfies MetadataEventDetail);
      } else if (isTranscodingMessage(parsed)) {
        // Transcoding may arrive over the data channel when the server
        // sends it after the WebSocket signaling channel has closed.
        this._transcodingDetail = {
          video: parsed.transcoding.video,
          audio: parsed.transcoding.audio,
        };
        this.emit('transcoding', this._transcodingDetail);
      } else if (isMimeInit(parsed)) {
        // Delivery method MIME may also arrive after signaling closes.
        this._deliveryMethodDetail = { method: 'mse', mime: parsed.mime };
        this.emit('deliverymethod', this._deliveryMethodDetail);
      }
    }
  }

  private cleanupDataChannel(): void {
    if (this.dataChannel) {
      if (this.dataChannelMessageHandler) {
        this.dataChannel.removeEventListener(
          'message',
          this.dataChannelMessageHandler,
        );
        this.dataChannelMessageHandler = null;
      }
      this.dataChannel.close();
      this.dataChannel = null;
    }
  }

  private stopSenderTracks(): void {
    try {
      for (const sender of this.pc.getSenders()) {
        sender.track?.stop();
      }
    } catch {
      // getSenders() may throw if the PC is already closed.
    }
  }
}
