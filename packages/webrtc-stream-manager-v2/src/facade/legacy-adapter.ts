// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Observable, BehaviorSubject, Subject, takeUntil, of } from 'rxjs';
import { StreamManager, type StreamManagerConfig } from '../core/stream-manager';
import type { CameraConnection } from '../core/camera-connection';
import {
  type WebRtcUrlConfig,
  AvailableStreams,
  type TrackEventDetail,
  type TimestampEventDetail,
  type MetadataEventDetail,
  ConnectionError,
  TargetStream,
} from '../types';

/** A DC `timestamp` event: the epoch-ms and RTP readings of one instant. */
export interface DcTimestampPair {
  timestampMs: number;
  rtpTimestamp: number;
}

/** 90 kHz SRTP video clock ticks per millisecond. */
const RTP_TICKS_PER_MS = 90;

/**
 * RTP stepping back further than this means a timeline reset (reconnect
 * restarts the clock near 0; a u32 wrap is indistinguishable), not the
 * reordering jitter of an unreliable data channel.
 */
const RTP_RESET_BACKWARD_TICKS = 30_000 * RTP_TICKS_PER_MS;

/** Beyond this gap from the nearest pair, the binding is stale — return null
 *  so the caller falls back to its own anchor. */
const MAX_BINDING_GAP_MS = 30_000;

/**
 * Maps a frame's rVFC `metadata.rtpTimestamp` to the epoch-ms displayed,
 * interpolating from a rolling window of DC pairs (DC events and the SRTP
 * track share one 90 kHz clock):
 * `epochMs = pair.timestampMs + (rvfcRtp − pair.rtpTimestamp) / 90`
 */
export class RtpEpochBinder {
  private static readonly MAX_PAIRS = 8;

  private readonly pairs: DcTimestampPair[] = [];

  push(pair: DcTimestampPair): void {
    const newest = this.pairs[this.pairs.length - 1];
    if (newest && pair.rtpTimestamp < newest.rtpTimestamp - RTP_RESET_BACKWARD_TICKS) {
      // Timeline reset: pre-reset pairs would bind the new clock to old epochs.
      this.pairs.length = 0;
    }
    this.pairs.push(pair);
    if (this.pairs.length > RtpEpochBinder.MAX_PAIRS) {
      this.pairs.shift();
    }
  }

  /**
   * Epoch-ms for an RTP timestamp, interpolated from the nearest DC pair
   * (nearest, not last: the unreliable data channel can reorder events).
   * Null when no pair is within {@link MAX_BINDING_GAP_MS}.
   */
  epochMsFor(rtpTimestamp: number): number | null {
    let best: DcTimestampPair | undefined;
    let bestGapTicks = Infinity;
    for (const pair of this.pairs) {
      const gapTicks = Math.abs(rtpTimestamp - pair.rtpTimestamp);
      if (gapTicks < bestGapTicks) {
        bestGapTicks = gapTicks;
        best = pair;
      }
    }
    if (!best || bestGapTicks > MAX_BINDING_GAP_MS * RTP_TICKS_PER_MS) {
      return null;
    }
    return best.timestampMs + (rtpTimestamp - best.rtpTimestamp) / RTP_TICKS_PER_MS;
  }
}

/**
 * Legacy facade that provides backward-compatible API matching the v1
 * WebRTCStreamManager. Wraps the v2 StreamManager singleton.
 *
 * This class allows zero-change migration for existing v1 consumers.
 * The static config properties (logger, RELAY_URL, etc.) accumulate
 * settings and lazily configure the StreamManager on the first connect() call.
 *
 * ## Usage
 *
 * ```ts
 * // Set config (before first connect)
 * WebRTCStreamManager.logger = window.console;
 * WebRTCStreamManager.RELAY_URL = 'relay.vmsproxy.com';
 * WebRTCStreamManager.USE_RELAY_PREFIX = true;
 *
 * // Connect a camera
 * WebRTCStreamManager.connect(urlConfig, videoEl).subscribe(([stream, error, instance]) => {
 *   if (stream) videoEl.srcObject = stream;
 *   if (error) handleError(error);
 * });
 *
 * // Global controls
 * WebRTCStreamManager.updatePosition(5000);
 * WebRTCStreamManager.togglePlaying();
 * WebRTCStreamManager.closeAll();
 * ```
 */
export class WebRTCStreamManager {
  // ── Static config (set before first connect) ─────────────────────────

  static logger: Console | undefined;
  /** Stub for v1 compatibility — v2 handles quality internally. Always emits false. */
  static hasPerformanceIssues$ = of(false);
  static USE_UNRELIABLE_DATA_CHANNEL = true;
  static RELAY_URL = '{systemId}.relay.vmsproxy.com';
  static maxBehind = 5;
  static USE_RELAY_PREFIX = false;
  static position = 0;

  // ── Private state ────────────────────────────────────────────────────

  private static _configured = false;

  /**
   * Lazily configure the StreamManager from accumulated static settings.
   * Called on first connect() and returns the singleton.
   */
  private static ensureConfigured(): StreamManager {
    if (!WebRTCStreamManager._configured) {
      const config: StreamManagerConfig = {
        relayUrl: WebRTCStreamManager.RELAY_URL,
        useRelayPrefix: WebRTCStreamManager.USE_RELAY_PREFIX,
        maxBehind: WebRTCStreamManager.maxBehind,
        useUnreliableDataChannel: WebRTCStreamManager.USE_UNRELIABLE_DATA_CHANNEL,
        logger: WebRTCStreamManager.logger,
      };
      StreamManager.configure(config);
      WebRTCStreamManager._configured = true;
    }
    return StreamManager.getInstance();
  }

  /**
   * Connect to a camera. Returns an Observable that emits
   * `[MediaStream | null, ConnectionError | null, WebRTCStreamManager]`.
   *
   * In the v2 facade, this bridges the event-based CameraConnection API to
   * the RxJS Observable contract expected by front_end consumers.
   *
   * @param webRtcUrlConfig - Camera connection parameters.
   * @param videoElement - Optional video element to attach the stream to.
   * @param targetStreams - Optional override for available streams.
   * @param accessToken - Optional access token or token factory.
   */
  static connect(
    webRtcUrlConfig: WebRtcUrlConfig,
    videoElement?: HTMLVideoElement,
    targetStreams?: AvailableStreams[] | null,
    accessToken?: string | (() => string | Promise<string>),
  ): Observable<[MediaStream | null, ConnectionError | null, WebRTCStreamManager]> {
    const manager = WebRTCStreamManager.ensureConfigured();

    // Merge overrides into the config.
    const config: WebRtcUrlConfig = { ...webRtcUrlConfig };
    if (targetStreams) {
      config.availableStreams = targetStreams;
    }
    if (accessToken !== undefined) {
      config.accessToken = accessToken;
    }

    const connection = manager.connect(config, videoElement ?? undefined);
    const instance = new WebRTCStreamManager(connection);

    return instance._mediaStream$;
  }

  /**
   * Dispose all connections and reset the StreamManager singleton.
   * Returns a Promise that resolves to `true` for backward compatibility.
   */
  static closeAll(): Promise<true> {
    if (WebRTCStreamManager._configured) {
      WebRTCStreamManager._configured = false;
      return StreamManager.getInstance()
        .closeAll()
        .then(() => true as const);
    }
    return Promise.resolve(true as const);
  }

  /** Cached facade wrappers keyed by connection key — one wrapper per CameraConnection. */
  private static readonly _instanceCache = new WeakMap<CameraConnection, WebRTCStreamManager>();

  /**
   * Get a facade wrapper for an existing camera connection.
   * Returns `null` if no connection exists for the given camera.
   *
   * Returns the same wrapper instance for the same underlying CameraConnection,
   * so subscriptions on `mediaStream$` / `currentPosition$` remain stable.
   */
  static getInstance(cameraId: { id: string; systemId: string }): WebRTCStreamManager | null {
    if (!WebRTCStreamManager._configured) return null;
    const key = `${cameraId.systemId}:${cameraId.id}`;
    const connection = StreamManager.getInstance().getConnection(key);
    if (!connection) return null;

    let instance = WebRTCStreamManager._instanceCache.get(connection);
    if (!instance) {
      instance = new WebRTCStreamManager(connection);
      WebRTCStreamManager._instanceCache.set(connection, instance);
    }
    return instance;
  }

  /**
   * Update playback position for all cameras.
   * @param position - Position in milliseconds. Defaults to 0 (live).
   */
  static updatePosition(position = 0): void {
    const rounded = Math.round(position);
    WebRTCStreamManager.position = rounded;
    if (WebRTCStreamManager._configured) {
      StreamManager.getInstance().updatePosition(
        rounded || undefined,
      );
    }
  }

  /**
   * Update playback position for a specific camera.
   * @param camera - Object with id and systemId identifying the camera.
   * @param positionMs - Playback position in milliseconds.
   */
  static updateCameraPosition(
    camera: { id: string; systemId: string },
    positionMs: number,
  ): void {
    if (WebRTCStreamManager._configured) {
      StreamManager.getInstance().updateCameraPosition(camera, positionMs);
    }
  }

  /** Toggle the playing state for all cameras. */
  static togglePlaying(): void {
    if (WebRTCStreamManager._configured) {
      StreamManager.getInstance().togglePlaying();
    }
  }

  /** Update playback speed for all cameras. */
  static updateSpeed(speed: number): void {
    if (WebRTCStreamManager._configured) {
      StreamManager.getInstance().updateSpeed(speed);
    }
  }

  /** Pause all camera streams. */
  static pause(): void {
    if (WebRTCStreamManager._configured) {
      StreamManager.getInstance().setPlaying(false);
    }
  }

  /** Resume all camera streams. */
  static play(): void {
    if (WebRTCStreamManager._configured) {
      StreamManager.getInstance().setPlaying(true);
    }
  }

  /** Advance all paused streams by one frame. */
  static nextFrame(): void {
    if (WebRTCStreamManager._configured) {
      StreamManager.getInstance().nextFrame();
    }
  }

  /** Whether the manager is currently in a playing state. */
  static get isPlaying(): boolean {
    if (!WebRTCStreamManager._configured) return true;
    return StreamManager.getInstance().playing;
  }

  // ── Instance API (per-connection wrapper) ────────────────────────────

  private readonly _close$ = new Subject<void>();

  /**
   * Observable of `[MediaStream | null, ConnectionError | null, this]`.
   * Emits whenever a track or error event fires on the underlying connection.
   */
  private readonly _mediaStream$: Observable<
    [MediaStream | null, ConnectionError | null, WebRTCStreamManager]
  >;

  /**
   * Public media stream state for v1 compatibility.
   * Exposes a BehaviorSubject so consumers can synchronously read `.value`
   * (e.g. sync-debug component checks `instance.mediaStream$.value`).
   */
  readonly mediaStream$ = new BehaviorSubject<
    [MediaStream | null, ConnectionError | null, WebRTCStreamManager] | null
  >(null);

  /** Current position observable -- emits timestamp events from the data channel. */
  readonly currentPosition$: BehaviorSubject<number>;

  /** Stub for v1 compatibility — v2 does not track MSE chunk duration. */
  readonly chunkDuration$ = new BehaviorSubject<number>(0);
  /** Stub for v1 compatibility — v2 does not track MSE buffered duration. */
  readonly bufferedDuration$ = new BehaviorSubject<number>(0);
  /** Stub for v1 compatibility — v2 does not adjust playback rate. */
  readonly playbackRate$ = new BehaviorSubject<number>(1);

  /** The connection key for the underlying camera (e.g. "systemId:cameraId"). */
  get cameraId(): string {
    return this._connection.connectionKey;
  }

  /** Rolling DC-pair binding for {@link displayedEpochMs}. */
  private readonly _rtpEpochBinder = new RtpEpochBinder();

  private constructor(private readonly _connection: CameraConnection) {
    this.currentPosition$ = new BehaviorSubject<number>(0);

    // Routed eagerly (not inside the cold _mediaStream$ callback) because
    // getInstance() and connect() return different wrapper instances and only
    // connect's wrapper gets a _mediaStream$ subscriber.
    const unsubTimestamp = _connection.on(
      'timestamp',
      (detail: TimestampEventDetail) => {
        const epochMs =
          detail.timestampMs !== undefined
            ? detail.timestampMs
            : detail.timestamp !== undefined
              ? detail.timestamp * 1000
              : undefined;
        if (epochMs === undefined) {
          return;
        }
        this.currentPosition$.next(epochMs);
        if (typeof detail.rtpTimestamp === 'number') {
          this._rtpEpochBinder.push({ timestampMs: epochMs, rtpTimestamp: detail.rtpTimestamp });
        }
      },
    );
    this._close$.subscribe({ complete: () => unsubTimestamp() });

    // Bridge the event-based CameraConnection API to an RxJS Observable.
    //
    // Every track event from the CameraConnection is forwarded so that
    // the video player can rebuild its pipeline (e.g. canvas zoom) when
    // the active track changes during quality switches.
    this._mediaStream$ = new Observable<
      [MediaStream | null, ConnectionError | null, WebRTCStreamManager]
    >((subscriber) => {
      const unsubTrack = _connection.on('track', (detail: TrackEventDetail) => {
        const stream = detail.streams[0] ?? null;
        const tuple: [MediaStream | null, ConnectionError | null, WebRTCStreamManager] = [stream, null, this];
        this.mediaStream$.next(tuple);
        subscriber.next(tuple);
      });

      const unsubError = _connection.on('error', (error: ConnectionError) => {
        const tuple: [MediaStream | null, ConnectionError | null, WebRTCStreamManager] = [null, error, this];
        this.mediaStream$.next(tuple);
        subscriber.next(tuple);
      });

      return () => {
        unsubTrack();
        unsubError();
        this._close$.next();
        this._close$.complete();
      };
    }).pipe(takeUntil(this._close$));
  }

  /**
   * Current video position reported by mediaserver (in microseconds for v1 compat).
   * Returns the latest value from the currentPosition$ BehaviorSubject.
   */
  get currentPosition(): number {
    return this.currentPosition$.value;
  }

  /**
   * Epoch-ms of the frame with the given rVFC `metadata.rtpTimestamp`. Null
   * when no usable binding exists (no DC pairs, or reset/stale timeline) —
   * callers then fall back to `currentPosition`.
   */
  displayedEpochMs(rvfcRtpTimestamp: number): number | null {
    return this._rtpEpochBinder.epochMsFor(rvfcRtpTimestamp);
  }

  /** Whether this connection's server-side stream is paused. */
  get isPaused(): boolean {
    return this._connection.isPaused;
  }

  /**
   * Encoder index of the stream currently being played (v1-compatible).
   * 0 = primary, 1 = secondary.
   */
  currentStream(): 0 | 1 {
    return this._connection.activeStreamIndex as 0 | 1;
  }

  /**
   * Codec mime of the video actually being delivered (MSE mime or the
   * negotiated codec from PC stats). Resolves to `''` when unknown.
   */
  getPlayingCodec(): Promise<string> {
    return this._connection.getPlayingCodec();
  }

  /**
   * Update playback position for this specific camera.
   * Returns true if the data channel was used.
   */
  updatePosition(position: number): boolean {
    this._connection.updatePosition(position);
    return true;
  }

  /** Full PC teardown + rebuild. Use to recover silent stalls (DC seek won't help). */
  reconnect(): void {
    this._connection.reconnect();
  }

  /** Pause this camera's server-side stream via the data channel. */
  sendPause(): boolean {
    return this._connection.sendPause();
  }

  /** Resume this camera's server-side stream via the data channel. */
  sendResume(): boolean {
    return this._connection.sendResume();
  }

  /** Pause/resume driven by archive data availability. */
  setDataPaused(paused: boolean): boolean {
    return this._connection.setDataPaused(paused);
  }

  /** Enable analytics metadata on this camera's connection. */
  enableMetadata(): void {
    this._connection.enableMetadata();
  }

  /** Disable analytics metadata on this camera's connection. */
  disableMetadata(): void {
    this._connection.disableMetadata();
  }

  /** Whether analytics metadata is currently enabled. */
  get metadataEnabled(): boolean {
    return this._connection.metadataEnabled;
  }

  /**
   * Subscribe to analytics metadata events from the data channel.
   * Returns an unsubscribe function.
   */
  onMetadata(handler: (detail: MetadataEventDetail) => void): () => void {
    return this._connection.on('metadata', handler);
  }

  /**
   * Update available streams for this connection.
   *
   * Maps v1's AvailableStreams array to v2's targetStream setter:
   * - [SECONDARY] only → LOW (never request high-res)
   * - [PRIMARY] only → HIGH (always request high-res)
   * - both / other → AUTO (optimizer decides)
   */
  updateAvailableStreams(streams: AvailableStreams[]): void {
    let target: TargetStream;
    if (streams.length === 1 && streams[0] === AvailableStreams.SECONDARY) {
      target = TargetStream.LOW;
    } else if (streams.length === 1 && streams[0] === AvailableStreams.PRIMARY) {
      target = TargetStream.HIGH;
    } else {
      target = TargetStream.AUTO;
    }
    this._connection.targetStream = target;
  }

  /**
   * Close this camera connection for v1 compatibility.
   * Delegates to StreamManager.disconnect() which disposes the underlying
   * CameraConnection and removes it from the connection cache.
   *
   * @returns Promise resolving to `true` for backward compatibility.
   */
  close(): Promise<boolean> {
    this._close$.next();
    this._close$.complete();
    if (WebRTCStreamManager._configured) {
      StreamManager.getInstance().disconnect(this._connection.connectionKey);
    }
    return Promise.resolve(true);
  }
}
