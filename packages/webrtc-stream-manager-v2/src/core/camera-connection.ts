// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Disposable } from './disposable';
import { PeerConnectionWrapper } from './peer-connection';
import { MseRenderer, MseRecoveryError } from './mse-renderer';
import {
  QualityMonitor,
  type QualitySnapshot,
} from '../strategies/quality-monitor';
import { withRetry, classifyError, type RetryConfig } from '../strategies/retry-policy';
import { linkSignal } from '../utils/abort-helpers';
import { extractPlayingCodecMime, isMseSupported } from '../utils/codecs';
import { diagTracker } from '../utils/diag-tracker';
import {
  AvailableStreams,
  PeerState,
  ConnectionError,
  TargetStream,
  type DeliveryMethod,
  type Logger,
  type Stream,
  type TrackEventDetail,
  type TimestampEventDetail,
  type StateChangeEventDetail,
  type MetadataEventDetail,
} from '../types';

// ─── Config ─────────────────────────────────────────────────────────────────

export interface CameraConnectionConfig {
  /** Unique key for this camera (e.g. "systemId:cameraId"). */
  connectionKey: string;
  /**
   * Build the signaling WebSocket URL for a given stream.
   * May return a Promise to support async operations like one-time ticket fetching.
   * Called fresh for each connection attempt (including retries) to ensure fresh tokens.
   */
  signalingUrl: (stream: AvailableStreams, deliveryMethod?: DeliveryMethod, enableMetadata?: boolean) => string | Promise<string>;
  /** Available streams for this camera (filtered to exclude transcoding streams when possible). */
  availableStreams: AvailableStreams[];
  /**
   * Which stream to connect first as the always-on base connection.
   * Determined by StreamManager based on codec viability:
   * - SECONDARY if it won't trigger transcoding (default behavior)
   * - PRIMARY if secondary requires transcoding or only primary is available
   * Defaults to SECONDARY if not provided.
   */
  initialStream?: AvailableStreams;
  /**
   * User's target stream preference. Affects quality optimizer behavior:
   * - AUTO: optimizer decides based on quality/focus
   * - HIGH: always request high-res upgrade
   * - LOW: never request high-res upgrade
   */
  targetStream?: TargetStream;
  /**
   * Whether the quality optimizer can automatically promote this connection
   * from SECONDARY → PRIMARY. False when PRIMARY requires transcoding or when
   * base is already PRIMARY (no upgrade available). Defaults to true.
   */
  canAutoUpgrade?: boolean;
  /** ICE servers for RTCPeerConnection. */
  iceServers?: RTCIceServer[];
  /** Optional parent signal for cascade disposal. */
  parentSignal?: AbortSignal;
  /** Optional logger. */
  logger?: Logger;
  /** Full mediaStreams data for codec-aware decisions (MSE fallback). */
  mediaStreams?: Stream[];
  /** If true, skip SRTP and connect directly with MSE delivery. */
  needsMse?: boolean;
  /** If true, request analytics metadata on the data channel. Default: true. */
  enableMetadata?: boolean;
  /** Override the default retry config for the always-alive low-res base connection. */
  lowResRetry?: Partial<RetryConfig>;
  /** Override the default retry config for the on-demand high-res upgrade connection. */
  highResRetry?: Partial<RetryConfig>;
  /**
   * Initial playback position (ms). 0/undefined = live. Used to seed the
   * connection's tracking state so the first {@link updatePosition} call from
   * StreamManager doesn't spuriously detect a live↔archive flip and reconnect.
   */
  initialPosition?: number;
  /** Initial playback speed. Default: 1. See {@link initialPosition}. */
  initialSpeed?: number | 'unlimited';
}

// ─── Event types ────────────────────────────────────────────────────────────

interface CameraConnectionEventMap {
  track: TrackEventDetail;
  timestamp: TimestampEventDetail;
  buffer: ArrayBuffer;
  statechange: StateChangeEventDetail;
  error: ConnectionError;
  msefallback: undefined;
  metadata: MetadataEventDetail;
  metadatachange: { enabled: boolean };
  /** Raw data channel message (string or ArrayBuffer). Fired for every message. */
  datachannel: string | ArrayBuffer;
}

type CameraConnectionEvent = keyof CameraConnectionEventMap;

// ─── Retry configurations ───────────────────────────────────────────────────

/** Aggressive retry for the always-alive low-res connection. */
const LOW_RES_RETRY: RetryConfig = {
  maxAttempts: 10,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
};

/** Gentle retry for on-demand high-res connection. */
const HIGH_RES_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 10_000,
};

/** Quality metrics polling interval (milliseconds). */
const QUALITY_POLL_MS = 1_000;

// ─── CameraConnection ──────────────────────────────────────────────────────

/**
 * Manages a per-camera WebRTC connection strategy with an always-alive
 * low-res connection and an on-demand high-res connection.
 *
 * Responsibilities:
 * - Permanent low-res {@link PeerConnectionWrapper} that retries aggressively
 * - Optional high-res {@link PeerConnectionWrapper} that retries gently and
 *   falls back to low-res on failure
 * - {@link QualityMonitor} for MOS / focus / stall tracking
 * - Unified event forwarding from whichever connection is currently active
 * - Smooth track swapping when transitioning between low and high resolution
 *
 * This class does **not** decide when to upgrade / downgrade — that decision
 * is made by the parent StreamManager via {@link requestHighRes} and
 * {@link releaseHighRes}.
 */
export class CameraConnection extends Disposable {
  readonly connectionKey: string;
  readonly qualityMonitor: QualityMonitor;

  private readonly config: CameraConnectionConfig;
  private readonly emitter = new EventTarget();
  private readonly lowResRetryConfig: RetryConfig;
  private readonly highResRetryConfig: RetryConfig;

  // ── Connection references ─────────────────────────────────────────────
  private basePc: PeerConnectionWrapper | null = null;
  private upgradePc: PeerConnectionWrapper | null = null;
  private baseMediaStream: MediaStream | null = null;
  private upgradeMediaStream: MediaStream | null = null;
  /** Single managed stream — tracks are swapped in-place so srcObject identity never changes. */
  private readonly managedStream = new MediaStream();
  /** Monotonic counter so stale deferred swaps become no-ops. */
  private _swapGeneration = 0;
  private _isUpgraded = false;
  private _state: PeerState = PeerState.connecting;

  /** The stream index used for the always-on base connection. */
  private baseStream: AvailableStreams;
  /** The stream index used for the on-demand upgrade connection. */
  private readonly upgradeStream: AvailableStreams;

  // ── Retry abort controllers (one per connect* call) ───────────────────
  private baseRetryAc: AbortController | null = null;
  private upgradeRetryAc: AbortController | null = null;

  // ── Event listener cleanups per connection ────────────────────────────
  private baseCleanups: (() => void)[] = [];
  private upgradeCleanups: (() => void)[] = [];

  // ── Swap listener cleanup ──────────────────────────────────────────
  private swapAbort: AbortController | null = null;

  // ── MSE fallback state ─────────────────────────────────────────────
  private mseRenderer: MseRenderer | null = null;
  private _deliveryMethod: DeliveryMethod = 'srtp';

  // ── Metadata state ────────────────────────────────────────────────
  private _metadataEnabled = true;

  // ── Reconnect cycle guard ────────────────────────────────────────────
  private baseFailureCycles = 0;
  private static readonly MAX_BASE_FAILURE_CYCLES = 3;

  // ── Circuit breaker: stop retrying after N consecutive WS failures ──
  private _consecutiveConnectFailures = 0;
  private static readonly MAX_CONSECUTIVE_CONNECT_FAILURES = 3;

  private rearmTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
  private static readonly BASE_REARM_COOLDOWN_MS = 30_000;
  /** Shorter cooldown for the first failure right after pause→resume; the
   *  server's previous SRTP session for this camera may still be cleaning up,
   *  and 30s of UNAVAILABLE for a known-transient case is too long. */
  private static readonly POST_RESUME_REARM_COOLDOWN_MS = 3_000;

  // ── Pause state ────────────────────────────────────────────────────
  private _isPaused = false;
  /** PC died while paused (server tore down media). Rebuild on next resume. */
  private _needsBaseRebuild = false;
  private _needsUpgradeRebuild = false;
  /** Set when sendResume kicks off a base rebuild; consumed on next rearm or success. */
  private _postResumeRebuildPending = false;

  // ── Playback state (forwarded to the active data channel) ─────────────
  private currentPosition: number;
  private currentSpeed: number | 'unlimited';
  /** Live frame timestamp (ms); used to align a fresh PC to actual playback, since `currentPosition` can be seconds stale. */
  private latestServerTimestampMs: number | undefined;

  constructor(config: CameraConnectionConfig) {
    super();
    this.currentPosition = config.initialPosition ?? 0;
    this.currentSpeed = config.initialSpeed ?? 1;
    config.logger?.info?.(`[WEBRTC-DIAG] [${config.connectionKey}] CameraConnection constructor`, { initialStream: config.initialStream, availableStreams: config.availableStreams, canAutoUpgrade: config.canAutoUpgrade, needsMse: config.needsMse, t: performance.now() });

    this.config = config;
    this.connectionKey = config.connectionKey;
    this.qualityMonitor = new QualityMonitor();

    // Merge user-provided retry overrides once at construction time.
    this.lowResRetryConfig = config.lowResRetry
      ? { ...LOW_RES_RETRY, ...config.lowResRetry }
      : LOW_RES_RETRY;
    this.highResRetryConfig = config.highResRetry
      ? { ...HIGH_RES_RETRY, ...config.highResRetry }
      : HIGH_RES_RETRY;

    // Determine base/upgrade streams from initialStream config.
    // Base = always-on connection, Upgrade = on-demand quality boost.
    const initial = config.initialStream ?? AvailableStreams.SECONDARY;
    this.baseStream = initial;
    this.upgradeStream =
      initial === AvailableStreams.SECONDARY
        ? AvailableStreams.PRIMARY
        : AvailableStreams.SECONDARY;

    // If this camera is known to need MSE, skip SRTP attempt and
    // start on PRIMARY for full resolution (MSE has no transcoding cost).
    // Respect explicit LOW target — the user chose low quality intentionally.
    if (config.needsMse) {
      this._deliveryMethod = 'mse';
      if (
        config.targetStream !== TargetStream.LOW &&
        config.availableStreams.includes(AvailableStreams.PRIMARY)
      ) {
        this.baseStream = AvailableStreams.PRIMARY;
      }
    }

    if (config.enableMetadata === false) {
      this._metadataEnabled = false;
    }

    if (config.parentSignal) {
      this.linkTo(config.parentSignal);
    }

    // Register disposal cleanup — runs when our AbortController aborts.
    this.onDispose(() => {
      this.disposeUpgradeInternal();
      this.disposeBaseInternal();
      this.qualityMonitor.dispose();
    });

    // Start the always-alive base connection.
    this.connectBase();

    // 1-second quality polling (auto-cleared on dispose via Disposable).
    this.setInterval(() => { this.pollQuality().catch(() => {}); }, QUALITY_POLL_MS);
  }

  // ── Public getters ────────────────────────────────────────────────────

  /**
   * The currently active {@link MediaStream} (from whichever connection
   * is active: base or upgrade). Returns `null` if no track has been received
   * yet or during a reconnection gap.
   */
  get activeStream(): MediaStream | null {
    return this.managedStream.getVideoTracks().length > 0
      ? this.managedStream
      : null;
  }

  /** Whether the upgrade connection is currently the active stream. */
  get isHighRes(): boolean {
    return this._isUpgraded;
  }

  /**
   * Encoder index of the stream currently being played: the base stream until
   * the upgrade track becomes active, then the upgrade stream.
   */
  get activeStreamIndex(): AvailableStreams {
    return this._isUpgraded ? this.upgradeStream : this.baseStream;
  }

  /**
   * Codec mime of the video actually being delivered: the MSE mime when in
   * MSE mode, otherwise the negotiated codec from the active peer connection's
   * stats. Resolves to `''` when it cannot be determined (e.g. no connection
   * or stats not ready yet).
   */
  async getPlayingCodec(): Promise<string> {
    if (this.mseRenderer && !this.mseRenderer.disposed) {
      return this.mseRenderer.mimeType;
    }
    const pc = this.activePc;
    if (!pc) return '';
    try {
      return extractPlayingCodecMime(await pc.getStats());
    } catch {
      // getStats can fail while the PC is closing — report unknown.
      return '';
    }
  }

  /** The user's target stream preference for this connection. */
  get targetStream(): TargetStream {
    return this.config.targetStream ?? TargetStream.AUTO;
  }

  /**
   * Change the target stream preference at runtime.
   * - HIGH: immediately requests high-res upgrade.
   * - LOW: immediately releases high-res.
   * - AUTO: lets the quality optimizer decide.
   */
  set targetStream(target: TargetStream) {
    if (this.config.targetStream === target) return;
    this.config.targetStream = target;

    // MSE cameras have no upgrade concept — the base connection itself
    // must be reconnected with the appropriate stream.
    if (this._deliveryMethod === 'mse') {
      this.reconnectBaseForTarget(target);
      return;
    }

    if (target === TargetStream.HIGH) {
      this.requestHighRes();
    } else if (target === TargetStream.LOW) {
      this.releaseHighRes();
    }
  }

  /** Whether the quality optimizer can auto-promote this connection to PRIMARY. */
  get canAutoUpgrade(): boolean {
    return this.config.canAutoUpgrade ?? true;
  }

  /** The current media delivery method (srtp or mse). */
  get deliveryMethod(): DeliveryMethod {
    return this._deliveryMethod;
  }

  /** Whether analytics metadata is enabled on the data channel. */
  get metadataEnabled(): boolean {
    return this._metadataEnabled;
  }

  /** Current lifecycle state of the active connection. */
  get state(): PeerState {
    return this._state;
  }

  // ── Public event API ──────────────────────────────────────────────────

  on(
    event: 'track',
    listener: (detail: TrackEventDetail) => void,
  ): () => void;
  on(
    event: 'timestamp',
    listener: (detail: TimestampEventDetail) => void,
  ): () => void;
  on(event: 'buffer', listener: (data: ArrayBuffer) => void): () => void;
  on(
    event: 'statechange',
    listener: (detail: StateChangeEventDetail) => void,
  ): () => void;
  on(
    event: 'error',
    listener: (error: ConnectionError) => void,
  ): () => void;
  on(event: 'msefallback', listener: () => void): () => void;
  on(
    event: 'metadata',
    listener: (detail: MetadataEventDetail) => void,
  ): () => void;
  on(
    event: 'metadatachange',
    listener: (detail: { enabled: boolean }) => void,
  ): () => void;
  on(
    event: 'datachannel',
    listener: (data: string | ArrayBuffer) => void,
  ): () => void;
  on(
    event: CameraConnectionEvent,
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

  // ── Public control ────────────────────────────────────────────────────

  /** The peer connection currently forwarding events (upgrade if active, else base). */
  private get activePc(): PeerConnectionWrapper | null {
    return this._isUpgraded ? this.upgradePc : this.basePc;
  }

  /**
   * Start the upgrade connection. Only proceeds if:
   * - The upgrade stream is PRIMARY (upgrading to higher resolution)
   * - PRIMARY is in `availableStreams`
   * - Upgrade is not already active or connecting
   *
   * When the base connection already started on PRIMARY (because secondary
   * requires transcoding), this is a no-op since there's nothing higher
   * to upgrade to.
   */
  requestHighRes(): void {
    if (this.disposed) return;
    // MSE delivers native quality — no upgrade concept.
    if (this._deliveryMethod === 'mse') return;
    // Upgrade is only meaningful SECONDARY → PRIMARY (higher resolution).
    // When base is already PRIMARY, there's nothing higher to switch to.
    if (this.upgradeStream !== AvailableStreams.PRIMARY) return;
    if (!this.config.availableStreams.includes(AvailableStreams.PRIMARY)) return;
    if (this._isUpgraded) return;
    if (this.upgradeRetryAc) return;

    this.connectUpgrade();
  }

  /**
   * Tear down the upgrade connection and fall back to the base stream.
   * If the base stream has a track, a new `track` event is emitted immediately.
   */
  releaseHighRes(): void {
    if (this.disposed) return;
    if (!this.upgradePc && !this.upgradeRetryAc) return;

    const wasUpgraded = this._isUpgraded;

    // Swap base onto the managed stream BEFORE disposing upgrade — otherwise the element stalls between tracks.
    // Only a `live` track is a usable fallback; an `ended` one would leave the consumer on a dead stream.
    const baseTrack = wasUpgraded && this.baseMediaStream
      ? this.baseMediaStream.getVideoTracks().find((t) => t.readyState === 'live')
      : undefined;
    if (baseTrack) {
      // Existing base track — already paused/frozen when paused, not a fresh
      // stream — so reveal it immediately as the inter-track fallback.
      this.doSwapManagedTrack(baseTrack);
    }

    this.disposeUpgradeInternal();

    if (wasUpgraded) {
      if (baseTrack) {
        this.emit('track', {
          track: baseTrack,
          streams: [this.managedStream],
        } as TrackEventDetail);
      } else if (!this.baseRetryAc) {
        // No live base track and no retry in flight: rebuild base now rather than wait for consumer timeout.
        this.disposeBaseInternal();
        this.connectBase();
      }
      this.updateState(this.basePc?.state ?? PeerState.connecting);
    }
  }

  private forEachPc(callback: (pcw: PeerConnectionWrapper) => void): void {
    if (this.basePc) callback(this.basePc);
    if (this.upgradePc) callback(this.upgradePc);
  }

  /**
   * Seek to a playback position. Within archive (or live→live), forwards a
   * `seek` over the data channel. On a live↔archive boundary flip, performs
   * a full reconnect because the server bakes `positionMs` into the SDP at
   * handshake time and cannot switch modes mid-stream.
   */
  updatePosition(positionMs: number): void {
    const wasLive = !this.currentPosition;
    const willBeLive = !positionMs;
    this.currentPosition = positionMs;
    // User's seek is authoritative; clear so dcopen-resync doesn't override it.
    this.latestServerTimestampMs = undefined;
    if (wasLive !== willBeLive) {
      this.reconnectForPlaybackChange();
      return;
    }
    // Live→live: nothing to seek. The server parses {"seek":0} as an absolute
    // epoch-0 archive position (only negative values map to DATETIME_NOW), so
    // sending it would silently flip every provider to archive-at-1970 and
    // halt the stream (CLOUD-18232).
    if (willBeLive) return;
    this.forEachPc((pcw) => pcw.sendSeek(positionMs));
  }

  /** Whether this connection is currently paused. */
  get isPaused(): boolean {
    return this._isPaused;
  }

  /** _isPaused is set unconditionally so dcopen-resync can match state on a fresh PC mid-reconnect. */
  sendPause(): boolean {
    this._isPaused = true;
    let sent = false;
    this.forEachPc((pcw) => { if (pcw.sendPause()) sent = true; });
    return sent;
  }

  sendResume(): boolean {
    this._isPaused = false;
    // CLOUD-17616: reveal any track deferred while paused — playing is fine now.
    this.revealPendingVisibleTrack();
    if (this._needsBaseRebuild) {
      this._needsBaseRebuild = false;
      if (!this.basePc && !this.baseRetryAc) {
        this._postResumeRebuildPending = true;
        this.connectBase();
      }
    }
    if (this._needsUpgradeRebuild) {
      this._needsUpgradeRebuild = false;
      if (!this.upgradePc && !this.upgradeRetryAc) {
        this.connectUpgrade();
      }
    }
    let sent = false;
    this.forEachPc((pcw) => { if (pcw.sendResume()) sent = true; });
    return sent;
  }

  sendNextFrame(): boolean {
    const cameraId = this.connectionKey.split(':')[1];
    let sent = false;
    this.forEachPc((pcw) => { if (pcw.sendNextFrame(cameraId)) sent = true; });
    return sent;
  }

  /**
   * Update playback speed. The server bakes `speed` into the SDP at handshake
   * time, so an archive speed change requires a full reconnect. In live mode
   * the wire is always unlimited, so the value is just stored for the next
   * archive reconnect to pick up.
   */
  updateSpeed(speed: number | 'unlimited'): void {
    if (speed === this.currentSpeed) return;
    this.currentSpeed = speed;
    if (!this.currentPosition) return;
    this.reconnectForPlaybackChange();
  }

  /** Full PC teardown + rebuild for recovery; keeps the last server timestamp so playback resumes where it was, not at the stale seek. */
  reconnect(): void {
    if (this.disposed) return;
    // Only recover a connected-but-stalled PC; other states are owned by connectBase's retry/rearm.
    if (this._state !== PeerState.connected) return;
    // Recovery, not a user action: keep the last server timestamp so the rebuilt PC resumes at the current playback position, not the stale seek.
    this.reconnectForPlaybackChange(true);
  }

  /** Enable analytics metadata on the data channel. Reconnects the base connection. */
  enableMetadata(): void {
    if (this.disposed || this._metadataEnabled) return;
    this._metadataEnabled = true;
    this.emit('metadatachange', { enabled: true });
    this.reconnectBaseForMetadata();
  }

  /** Disable analytics metadata on the data channel. Reconnects the base connection. */
  disableMetadata(): void {
    if (this.disposed || !this._metadataEnabled) return;
    this._metadataEnabled = false;
    this.emit('metadatachange', { enabled: false });
    this.reconnectBaseForMetadata();
  }

  /** Set the video element used for viewport-based focus tracking. */
  setVideoElement(el: HTMLVideoElement): void {
    this.qualityMonitor.setVideoElement(el);
  }

  /** Return a synchronous quality snapshot for the global optimizer. */
  qualitySnapshot(): QualitySnapshot {
    return this.qualityMonitor.snapshot();
  }

  // ── Private: event emission ───────────────────────────────────────────

  private emit<K extends CameraConnectionEvent>(
    event: K,
    detail: CameraConnectionEventMap[K],
  ): void {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail }));
  }

  private updateState(newState: PeerState): void {
    if (this.disposed || newState === this._state) return;
    const previousState: PeerState | null = this._state;
    this._state = newState;
    this.emit('statechange', { state: newState, previousState });
  }

  // ── Private: base connection lifecycle ────────────────────────────────

  /**
   * Start (or restart) the base connection with aggressive retry.
   * The base stream is determined by {@link CameraConnectionConfig.initialStream}
   * and may be either PRIMARY or SECONDARY depending on codec viability.
   * Fire-and-forget — errors are caught and emitted as events.
   */
  private async connectBase(): Promise<void> {
    if (this.disposed) return;
    // Reset circuit breaker per reconnect cycle so each cycle gets fresh attempts.
    this._consecutiveConnectFailures = 0;
    const _diagStart = performance.now();
    this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] connectBase begin`, { baseStream: this.baseStream, deliveryMethod: this._deliveryMethod, t: _diagStart });

    const retryAc = new AbortController();
    this.baseRetryAc = retryAc;
    linkSignal(this.signal, retryAc);

    try {
      let _diagRetryAttempt = 0;
      const pcw = await withRetry(
        async () => {
          _diagRetryAttempt++;
          const dt = diagTracker.get(this.connectionKey);
          if (dt) dt.baseRetryAttempts = _diagRetryAttempt;
          diagTracker.phaseStart(this.connectionKey, `baseRetry#${_diagRetryAttempt}`);
          this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] connectBase retry attempt #${_diagRetryAttempt}`, { elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });
          const _diagTicketStart = performance.now();
          const signalingUrl = await this.config.signalingUrl(
            this.baseStream,
            this._deliveryMethod,
            this._metadataEnabled,
          );
          this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] connectBase signalingUrl built`, { signalingUrlLength: signalingUrl.length, ticketFetchMs: (performance.now() - _diagTicketStart).toFixed(1) + 'ms', elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });
          try {
            const pc = await this.createConnection(signalingUrl, retryAc.signal);
            this._consecutiveConnectFailures = 0;
            return pc;
          } catch (err) {
            this._consecutiveConnectFailures++;
            throw err;
          }
        },
        {
          ...this.lowResRetryConfig,
          // Circuit breaker: after N consecutive failures, stop retrying.
          // Prevents 100+ second stuck states when the server permanently
          // rejects connections (e.g. WS 500 for cameras that can't stream).
          classifyFn: (err) => {
            if (this._consecutiveConnectFailures >= CameraConnection.MAX_CONSECUTIVE_CONNECT_FAILURES) {
              return 'non-retryable';
            }
            return classifyError(err);
          },
        },
        retryAc.signal,
      );

      // Guard: disposed or superseded by a newer connectBase call.
      if (this.disposed || this.baseRetryAc !== retryAc) {
        pcw.dispose();
        return;
      }

      diagTracker.phaseEnd(this.connectionKey, `baseRetry#${_diagRetryAttempt}`);
      this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] connectBase withRetry resolved (PC connected)`, { elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });
      this.setBasePc(pcw);
    } catch {
      this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] connectBase withRetry FAILED (all retries exhausted)`, { elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });
      if (!this.disposed && this.baseRetryAc === retryAc) {
        // Let releaseHighRes detect "no retry running" and force-rebuild base.
        this.baseRetryAc = null;
        if (this._isPaused) {
          // Pause caused server to drop the SRTP session; defer until resume.
          this._needsBaseRebuild = true;
          return;
        }
        const dt = diagTracker.get(this.connectionKey);
        if (dt) {
          dt.errors.push('base_retries_exhausted');
          dt.finalState = 'failed';
        }
        this.config.logger?.error?.(
          `[${this.connectionKey}] Base connection (stream=${this.baseStream}) failed after all retries`,
        );
        this.emitLostConnectionIfNoFallback();
        this.scheduleBaseRearm();
      }
    }
  }

  /**
   * Wire up event forwarding from a connected base PeerConnectionWrapper.
   * Events are only forwarded when the base stream is the active stream
   * (i.e. upgrade is not active).
   */
  private setBasePc(pcw: PeerConnectionWrapper): void {
    this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] setBasePc wiring up event forwarding`, { pcwState: pcw.state, t: performance.now() });
    // Clean up any stale base event listeners / PCW (defensive).
    this.cleanupBasePc();

    this.basePc = pcw;

    this.baseCleanups.push(
      pcw.on('track', (detail) => {
        this.baseMediaStream = detail.streams[0] ?? null;
        // MSE delivers via DataChannel → MseRenderer; the RTP track is a
        // placeholder. Skip forwarding AND the ended listener — its end would
        // tear down a healthy MseRenderer. Replay path below is already gated.
        if (!this._isUpgraded && this._deliveryMethod !== 'mse') {
          this.attachBaseTrackEndedListener(detail.track, pcw);
          this.swapManagedTrack(detail.track, pcw);
          this.emit('track', {
            track: detail.track,
            streams: [this.managedStream],
          } as TrackEventDetail);
        }
      }),
      pcw.on('timestamp', (detail) => {
        if (!this._isUpgraded) {
          if (typeof detail.timestampMs === 'number') {
            this.latestServerTimestampMs = detail.timestampMs;
          }
          this.emit('timestamp', detail);
        }
      }),
      pcw.on('buffer', (data) => {
        // Feed MSE renderer if active.
        if (this.mseRenderer) {
          this.mseRenderer.appendBuffer(data);
        }
        if (!this._isUpgraded) {
          this.emit('buffer', data);
        }
      }),
      pcw.on('statechange', (detail) => {
        if (detail.state === PeerState.connected) {
          this.baseFailureCycles = 0;
          this._postResumeRebuildPending = false;
        }
        if (!this._isUpgraded) {
          this.updateState(detail.state);
        }
        if (detail.state === PeerState.failed) {
          this.handleBaseFailure();
        }
      }),
      pcw.on('dcopen', () => this.resyncPausedState(pcw)),
      pcw.on('metadata', (detail) => {
        // Metadata is UNCONDITIONAL — always forwarded from base,
        // regardless of whether the upgrade connection is active.
        this.emit('metadata', detail);
      }),
      pcw.on('transcoding', (detail) => {
        if (detail.video && this.shouldFallbackToMse()) {
          this.reconnectWithMse();
        }
      }),
      pcw.on('datachannel', (data) => {
        this.emit('datachannel', data);
      }),
    );

    // Replay stored transcoding detail (arrives during signaling, before
    // ICE connects and before setBasePc is called — same pattern as
    // activeStream and deliveryMethod replay).
    if (pcw.transcoding?.video && this.shouldFallbackToMse()) {
      this.reconnectWithMse();
      return;
    }

    // Wire MSE renderer when in MSE delivery mode.
    if (this._deliveryMethod === 'mse') {
      this.baseCleanups.push(
        pcw.on('deliverymethod', (detail) => {
          if (detail.method === 'mse' && detail.mime && !this.mseRenderer) {
            this.initMseRenderer(detail.mime);
          }
        }),
      );
      // Check if deliveryMethod was already received before listener registration.
      if (pcw.deliveryMethod?.method === 'mse' && pcw.deliveryMethod.mime) {
        this.initMseRenderer(pcw.deliveryMethod.mime);
      }
    }

    // Replay stored track if it was received before listeners were added.
    // (ontrack fires during SDP negotiation, before ICE connects.)
    // Skip in MSE mode — the SRTP track is a placeholder; real track
    // comes from MseRenderer's captureStream() (same guard as on('track')).
    if (pcw.activeStream && !this._isUpgraded && this._deliveryMethod !== 'mse') {
      this.baseMediaStream = pcw.activeStream;
      const track = pcw.activeStream.getVideoTracks()[0];
      if (track) {
        this.attachBaseTrackEndedListener(track, pcw);
        this.swapManagedTrack(track, pcw);
        this.emit('track', {
          track,
          streams: [this.managedStream],
        } as TrackEventDetail);
      }
    }

    if (pcw.state === PeerState.connected) {
      this.baseFailureCycles = 0;
      this._postResumeRebuildPending = false;
    }
    if (pcw.dataChannelOpen) {
      this.resyncPausedState(pcw);
    }
    if (!this._isUpgraded) {
      this.updateState(pcw.state);
    }
  }

  /** Align a fresh PCW to current playback. Pause is replayed in any mode; seek only applies in archive. */
  private resyncPausedState(pcw: PeerConnectionWrapper): void {
    if (this._isPaused) {
      pcw.sendPause();
    }
    // Seek only applies in archive (a position is set).
    if (
      this.currentPosition &&
      (this._isPaused || this.latestServerTimestampMs !== undefined)
    ) {
      pcw.sendSeek(this.latestServerTimestampMs ?? this.currentPosition);
    }
    // CLOUD-17616: pause has now been (re)applied to this PC, so a track this PC
    // deferred while paused will show a frozen frame, not live-playing video.
    if (this._isPaused) {
      this.revealPendingVisibleTrack(pcw);
    }
  }

  /**
   * After the circuit breaker trips, sit out a cooldown then re-enter
   * `connectBase` once. Recovers from transient outages (network blip,
   * server overload) without hammering. The connection's lifetime
   * AbortController auto-clears the timer on dispose.
   */
  private scheduleBaseRearm(): void {
    if (this.disposed) return;
    if (this.rearmTimer !== null) return;
    if (this.basePc || this.baseRetryAc) return;

    const cooldownMs = this._postResumeRebuildPending
      ? CameraConnection.POST_RESUME_REARM_COOLDOWN_MS
      : CameraConnection.BASE_REARM_COOLDOWN_MS;
    this._postResumeRebuildPending = false;

    this.config.logger?.info?.(
      `[WEBRTC-DIAG] [${this.connectionKey}] scheduling base rearm in ${cooldownMs}ms`,
    );
    this.rearmTimer = this.setTimeout(() => {
      this.rearmTimer = null;
      if (this.disposed || this.basePc || this.baseRetryAc) {
        this.config.logger?.info?.(
          `[WEBRTC-DIAG] [${this.connectionKey}] base rearm skipped (disposed=${this.disposed} basePc=${!!this.basePc} retryAc=${!!this.baseRetryAc})`,
        );
        return;
      }
      if (this._isPaused) {
        this.config.logger?.info?.(
          `[WEBRTC-DIAG] [${this.connectionKey}] base rearm deferred (paused)`,
        );
        this._needsBaseRebuild = true;
        return;
      }
      this.config.logger?.info?.(
        `[WEBRTC-DIAG] [${this.connectionKey}] base rearm firing, retrying connectBase`,
      );
      this._consecutiveConnectFailures = 0;
      this.baseFailureCycles = 0;
      this.connectBase();
    }, cooldownMs);
  }

  /** Suppress the error if upgrade is still delivering live frames — the user is watching working video. */
  private emitLostConnectionIfNoFallback(): void {
    const upgradeIsLive = this._isUpgraded
      && !!this.upgradeMediaStream
      && this.upgradeMediaStream.getVideoTracks().some((t) => t.readyState === 'live');
    if (upgradeIsLive) return;
    this.emit('error', ConnectionError.lostConnection);
    this.updateState(PeerState.failed);
  }

  /**
   * Called when an established base connection fails. Tears down the
   * old connection and starts a fresh retry cycle.
   *
   * While paused, server stops media → ICE consent times out and/or the
   * server ends the SRTP track. That's expected pause behavior, not a
   * fault: defer rebuild until {@link sendResume}.
   */
  private handleBaseFailure(): void {
    if (this.disposed) return;
    if (this._isPaused) {
      this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] handleBaseFailure deferred (paused)`);
      this._needsBaseRebuild = true;
      this.disposeBaseInternal();
      return;
    }
    this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] handleBaseFailure`, { cycle: this.baseFailureCycles + 1, maxCycles: CameraConnection.MAX_BASE_FAILURE_CYCLES, t: performance.now() });

    this.baseFailureCycles++;
    if (this.baseFailureCycles > CameraConnection.MAX_BASE_FAILURE_CYCLES) {
      const dt = diagTracker.get(this.connectionKey);
      if (dt) {
        dt.errors.push(`base_failure_cycles_exceeded(${this.baseFailureCycles})`);
        dt.finalState = 'failed';
      }
      this.config.logger?.error?.(
        `[${this.connectionKey}] Base connection exceeded ${CameraConnection.MAX_BASE_FAILURE_CYCLES} reconnect cycles, giving up`,
      );
      // Without disposeBaseInternal here, scheduleBaseRearm bails on its
      // `if (this.basePc) return` guard. Defensive — unreachable today.
      this.disposeBaseInternal();
      this.emitLostConnectionIfNoFallback();
      this.scheduleBaseRearm();
      return;
    }

    this.disposeBaseInternal();
    if (!this._isUpgraded) {
      this.updateState(PeerState.connecting);
    }
    this.connectBase();
  }

  // ── Private: upgrade connection lifecycle ─────────────────────────────

  /**
   * Start the upgrade connection with gentle retry. On failure, silently
   * falls back to base (no error event).
   */
  private async connectUpgrade(): Promise<void> {
    if (this.disposed) return;
    const _diagStart = performance.now();
    this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] connectUpgrade begin`, { upgradeStream: this.upgradeStream, t: _diagStart });

    const retryAc = new AbortController();
    this.upgradeRetryAc = retryAc;
    linkSignal(this.signal, retryAc);

    try {
      let _diagUpgradeAttempt = 0;
      const pcw = await withRetry(
        async () => {
          _diagUpgradeAttempt++;
          const dt = diagTracker.get(this.connectionKey);
          if (dt) dt.upgradeRetryAttempts = _diagUpgradeAttempt;
          // Only request metadata on the upgrade connection when it carries the
          // SECONDARY stream (rare — happens when base started on PRIMARY because
          // secondary requires transcoding). Normally the base/SECONDARY connection
          // is the persistent metadata source and the upgrade/PRIMARY doesn't need it.
          const needsMetadata =
            this._metadataEnabled && this.upgradeStream === AvailableStreams.SECONDARY;
          const signalingUrl = await this.config.signalingUrl(
            this.upgradeStream,
            this._deliveryMethod,
            needsMetadata,
          );
          return this.createConnection(signalingUrl, retryAc.signal);
        },
        this.highResRetryConfig,
        retryAc.signal,
      );

      if (this.disposed || this.upgradeRetryAc !== retryAc) {
        pcw.dispose();
        return;
      }

      this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] connectUpgrade withRetry resolved (PC connected)`, { elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });
      this.setUpgradePc(pcw);
    } catch {
      this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] connectUpgrade FAILED`, { elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });
      // Upgrade failure is non-fatal — stay on base silently.
      if (!this.disposed && this.upgradeRetryAc === retryAc) {
        this.config.logger?.warn?.(
          `[${this.connectionKey}] Upgrade connection (stream=${this.upgradeStream}) failed, staying on base`,
        );
        this.disposeUpgradeInternal();
      }
    }
  }

  /**
   * Wire up event forwarding from a connected upgrade PeerConnectionWrapper.
   *
   * The upgrade becomes the active stream only when the first track is received
   * (smooth swap — the base stream continues until the upgrade track is ready).
   */
  private setUpgradePc(pcw: PeerConnectionWrapper): void {
    this.upgradePc = pcw;

    this.upgradeCleanups.push(
      pcw.on('track', (detail) => {
        this.upgradeMediaStream = detail.streams[0] ?? null;
        this.attachUpgradeTrackEndedListener(detail.track, pcw);
        // Activate upgrade on first track (smooth swap from base).
        this._isUpgraded = true;
        this.swapManagedTrack(detail.track, pcw);
        this.emit('track', {
          track: detail.track,
          streams: [this.managedStream],
        } as TrackEventDetail);
      }),
      pcw.on('timestamp', (detail) => {
        if (this._isUpgraded) {
          if (typeof detail.timestampMs === 'number') {
            this.latestServerTimestampMs = detail.timestampMs;
          }
          this.emit('timestamp', detail);
        }
      }),
      pcw.on('buffer', (data) => {
        if (this._isUpgraded) {
          this.emit('buffer', data);
        }
      }),
      pcw.on('statechange', (detail) => {
        // On failure, fall back silently (no 'failed' state emitted).
        if (detail.state === PeerState.failed) {
          this.handleUpgradeFailure();
          return;
        }
        if (this._isUpgraded) {
          this.updateState(detail.state);
        }
      }),
      pcw.on('dcopen', () => this.resyncPausedState(pcw)),
      pcw.on('metadata', (detail) => {
        // Metadata from upgrade (HIGH stream) — the server only delivers
        // metadata on the high-quality stream, so this is the primary source.
        this.emit('metadata', detail);
      }),
      pcw.on('datachannel', (data) => {
        this.emit('datachannel', data);
      }),
    );

    // Replay stored track if it was received before listeners were added.
    if (pcw.activeStream) {
      this.upgradeMediaStream = pcw.activeStream;
      this._isUpgraded = true;
      const track = pcw.activeStream.getVideoTracks()[0];
      if (track) {
        this.attachUpgradeTrackEndedListener(track, pcw);
        this.swapManagedTrack(track, pcw);
        this.emit('track', {
          track,
          streams: [this.managedStream],
        } as TrackEventDetail);
      }
    }

    if (pcw.dataChannelOpen) {
      this.resyncPausedState(pcw);
    }
  }

  /** Upgrade failed — fall back to base via {@link releaseHighRes}. */
  private handleUpgradeFailure(): void {
    if (this.disposed) return;
    if (this._isPaused) {
      this.config.logger?.info?.(`[WEBRTC-DIAG] [${this.connectionKey}] handleUpgradeFailure deferred (paused)`);
      this._needsUpgradeRebuild = true;
      this.disposeUpgradeInternal();
      return;
    }
    this.releaseHighRes();
  }

  // ── Private: connection factory ───────────────────────────────────────

  /**
   * Create a {@link PeerConnectionWrapper} and return a Promise that
   * resolves when the connection reaches `connected` state.
   *
   * Rejects with {@link ConnectionError.lostConnection} on `failed` state
   * or `AbortError` if the signal is aborted.
   */
  private createConnection(
    signalingUrl: string,
    signal: AbortSignal,
  ): Promise<PeerConnectionWrapper> {
    return new Promise<PeerConnectionWrapper>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException('aborted', 'AbortError'));
        return;
      }

      const pcw = new PeerConnectionWrapper({
        signalingUrl,
        iceServers: this.config.iceServers,
        logger: this.config.logger,
      });

      let settled = false;

      const settle = (): void => {
        settled = true;
        signal.removeEventListener('abort', onAbort);
      };

      const unsubState = pcw.on(
        'statechange',
        (detail: StateChangeEventDetail) => {
          if (settled) return;
          if (detail.state === PeerState.connected) {
            settle();
            unsubState();
            resolve(pcw);
          } else if (detail.state === PeerState.failed) {
            settle();
            unsubState();
            pcw.dispose();
            reject(ConnectionError.lostConnection);
          }
        },
      );

      function onAbort(): void {
        if (settled) return;
        settle();
        unsubState();
        pcw.dispose();
        reject(new DOMException('aborted', 'AbortError'));
      }

      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  // ── Private: managed stream ──────────────────────────────────────────

  /**
   * Track deferred by {@link swapManagedTrack} because the connection was paused
   * when it arrived, together with the PC it came from. Revealed once that PC has
   * been paused server-side ({@link resyncPausedState}) or on resume
   * ({@link sendResume}). CLOUD-17616.
   */
  private _pendingVisibleTrack: MediaStreamTrack | null = null;
  private _pendingVisiblePcw: PeerConnectionWrapper | null = null;

  /**
   * Make `newTrack` the visible track in the managed stream.
   *
   * CLOUD-17616: a freshly (re)connected or quality-upgraded PC streams from its
   * SDP-baked position and plays on-screen until its dcopen-resync pauses it (see
   * {@link resyncPausedState}). While paused that would show live-playing video even
   * though the UI is paused. So when the connection is paused and the source PC has
   * not been paused yet — its data channel is not open, so neither resyncPausedState
   * nor sendPause has reached it — hold the current frozen frame and defer the swap.
   * The deferred track is revealed once the PC is paused or playback resumes. The
   * deferral is skipped when there is no current track to fall back on (avoids a
   * blank tile), and for callers that pass no `pcw` (existing-base fallbacks, which
   * are already frozen when paused).
   */
  private swapManagedTrack(
    newTrack: MediaStreamTrack,
    pcw?: PeerConnectionWrapper,
  ): void {
    const pcAlreadyPaused = pcw?.dataChannelOpen ?? false;
    if (
      this._isPaused &&
      !pcAlreadyPaused &&
      this.managedStream.getVideoTracks().length > 0
    ) {
      this._pendingVisibleTrack = newTrack;
      this._pendingVisiblePcw = pcw ?? null;
      return;
    }
    this.doSwapManagedTrack(newTrack);
  }

  /**
   * Reveal a track deferred by {@link swapManagedTrack}. When triggered by a
   * specific PC's resync, only reveal that PC's track — another PC's stream may
   * still be playing. With no PC (resume), reveal unconditionally.
   */
  private revealPendingVisibleTrack(pcw?: PeerConnectionWrapper): void {
    if (!this._pendingVisibleTrack) return;
    if (pcw && this._pendingVisiblePcw && this._pendingVisiblePcw !== pcw) return;
    const track = this._pendingVisibleTrack;
    this.doSwapManagedTrack(track);
    this.emit('track', {
      track,
      streams: [this.managedStream],
    } as TrackEventDetail);
  }

  /**
   * Replace the video track on the managed stream so consumers keeping a
   * reference to it (via `srcObject`) see a seamless switch with no flash.
   *
   * The new track is added immediately (the browser continues rendering the
   * existing track since it's still first in the list). Old tracks are only
   * removed once the new track is producing frames (`muted === false`),
   * guaranteeing zero black-frame gaps. A generation counter ensures that
   * stale deferred removals (from a previous call) are silently discarded.
   */
  private doSwapManagedTrack(newTrack: MediaStreamTrack): void {
    // A real swap supersedes any deferred one.
    this._pendingVisibleTrack = null;
    this._pendingVisiblePcw = null;
    const gen = ++this._swapGeneration;

    // Cancel any pending 'unmute' listener from a previous swap call.
    this.swapAbort?.abort();
    this.swapAbort = new AbortController();

    // Add new track immediately — old track keeps rendering until removed.
    if (!this.managedStream.getVideoTracks().includes(newTrack)) {
      this.managedStream.addTrack(newTrack);
    }

    const removeOld = () => {
      if (gen !== this._swapGeneration) return; // Superseded by a newer swap.
      for (const old of this.managedStream.getVideoTracks()) {
        if (old !== newTrack) {
          this.managedStream.removeTrack(old);
        }
      }
    };

    if (!newTrack.muted) {
      // Track already producing frames — safe to remove old immediately.
      removeOld();
    } else {
      // Defer old-track removal until the new track has its first frame.
      // The signal ensures the listener is cleaned up on dispose or next swap.
      newTrack.addEventListener('unmute', removeOld, { once: true, signal: this.swapAbort.signal });
    }
  }

  // ── Private: cleanup helpers ──────────────────────────────────────────

  /** Server-side SRTP teardown can end the track without flipping ICE/connection state, so 'ended' is the trigger. */
  private attachBaseTrackEndedListener(
    track: MediaStreamTrack,
    pcw: PeerConnectionWrapper,
  ): void {
    const onEnded = () => {
      if (!this.disposed && this.basePc === pcw) {
        this.handleBaseFailure();
      }
    };
    track.addEventListener('ended', onEnded, { once: true });
    this.baseCleanups.push(() =>
      track.removeEventListener('ended', onEnded),
    );
    // Track may already have ended between signaling (when the track event
    // fired) and ICE-connected (when setBasePc subscribes), so the 'ended'
    // event is gone. Check readyState and schedule a microtask so recovery
    // doesn't reenter disposeBaseInternal mid-setBasePc.
    if (track.readyState === 'ended') {
      queueMicrotask(onEnded);
    }
  }

  /** Symmetric upgrade-side helper, routed to handleUpgradeFailure. */
  private attachUpgradeTrackEndedListener(
    track: MediaStreamTrack,
    pcw: PeerConnectionWrapper,
  ): void {
    const onEnded = () => {
      if (!this.disposed && this.upgradePc === pcw) {
        this.handleUpgradeFailure();
      }
    };
    track.addEventListener('ended', onEnded, { once: true });
    this.upgradeCleanups.push(() =>
      track.removeEventListener('ended', onEnded),
    );
    if (track.readyState === 'ended') {
      queueMicrotask(onEnded);
    }
  }

  /** Remove event listeners and dispose the base PCW (if present). */
  private cleanupBasePc(): void {
    for (const cleanup of this.baseCleanups) cleanup();
    this.baseCleanups = [];
    if (this.basePc && !this.basePc.disposed) {
      this.basePc.dispose();
    }
    this.basePc = null;
  }

  /** Full teardown of base: abort retry, cleanup PCW, clear stream, dispose MseRenderer. */
  private disposeBaseInternal(): void {
    this.baseRetryAc?.abort();
    this.baseRetryAc = null;
    this.swapAbort?.abort();
    this.swapAbort = null;
    if (this.rearmTimer !== null) {
      clearTimeout(this.rearmTimer);
      this.rearmTimer = null;
    }
    this.cleanupBasePc();
    this.baseMediaStream = null;
    if (this.mseRenderer && !this.mseRenderer.disposed) {
      this.mseRenderer.dispose();
    }
    this.mseRenderer = null;
  }

  /** Full teardown of upgrade: abort retry, cleanup PCW, clear stream. */
  private disposeUpgradeInternal(): void {
    this.upgradeRetryAc?.abort();
    this.upgradeRetryAc = null;
    for (const cleanup of this.upgradeCleanups) cleanup();
    this.upgradeCleanups = [];
    if (this.upgradePc && !this.upgradePc.disposed) {
      this.upgradePc.dispose();
    }
    this.upgradePc = null;
    this.upgradeMediaStream = null;
    this._isUpgraded = false;
  }

  // ── Private: MSE fallback ────────────────────────────────────────────

  /**
   * Whether the current stream should fall back from SRTP to MSE delivery.
   * Triggered reactively when the server reports transcoding — the server's
   * signal is the definitive indicator, so no codec matching is needed here.
   */
  private shouldFallbackToMse(): boolean {
    if (this._deliveryMethod === 'mse') return false;
    return isMseSupported();
  }

  /** Tear down SRTP connections and reconnect with MSE delivery. */
  private reconnectWithMse(): void {
    if (this.disposed) return;

    this._deliveryMethod = 'mse';
    this.emit('msefallback', undefined);

    // MSE delivers the native stream without transcoding, so switch to
    // PRIMARY for full resolution (no reason to stay on low-res SECONDARY).
    // Respect explicit LOW target — the user chose low quality intentionally.
    if (
      this.config.targetStream !== TargetStream.LOW &&
      this.config.availableStreams.includes(AvailableStreams.PRIMARY)
    ) {
      this.baseStream = AvailableStreams.PRIMARY;
    }

    // Tear down current connections.
    this.disposeBaseInternal();
    if (this.upgradePc || this.upgradeRetryAc) {
      this.disposeUpgradeInternal();
    }

    // Reconnect with MSE delivery method.
    this.updateState(PeerState.connecting);
    this.connectBase();
  }

  /**
   * Reconnect the base connection with a different stream for MSE cameras.
   * MSE cameras have no upgrade/downgrade concept — the base connection
   * itself must be torn down and rebuilt with the desired stream.
   */
  private reconnectBaseForTarget(target: TargetStream): void {
    if (this.disposed) return;

    const newStream =
      target === TargetStream.LOW || !this.config.availableStreams.includes(AvailableStreams.PRIMARY)
        ? AvailableStreams.SECONDARY
        : AvailableStreams.PRIMARY;

    // Skip reconnect if the base stream is already correct.
    if (this.baseStream === newStream) return;

    this.baseStream = newStream;
    this.disposeBaseInternal();
    this.updateState(PeerState.connecting);
    this.connectBase();
  }

  /**
   * Reconnect the base connection to toggle analytics metadata.
   * Follows the same pattern as {@link reconnectBaseForTarget}.
   *
   * Metadata is carried by the SECONDARY stream. In the normal case (base=SECONDARY),
   * only the base needs reconnecting. When the upgrade carries SECONDARY (rare: base
   * started on PRIMARY because secondary requires transcoding), the upgrade also
   * needs reconnecting so its metadata flag updates.
   */
  private reconnectBaseForMetadata(): void {
    if (this.disposed) return;

    // Only reconnect upgrade if it carries SECONDARY (the metadata stream).
    const upgradeNeedsReconnect =
      this._isUpgraded && this.upgradeStream === AvailableStreams.SECONDARY;
    if (upgradeNeedsReconnect) {
      this.disposeUpgradeInternal();
    }

    this.disposeBaseInternal();
    this.updateState(PeerState.connecting);
    this.connectBase();

    if (upgradeNeedsReconnect) {
      this.connectUpgrade();
    }
  }

  /**
   * Reconnect base (and upgrade if active) when URL-baked playback params
   * change — i.e. a live↔archive boundary flip or an archive speed change.
   * The server bakes `positionMs` and `speed` into the SDP at handshake time
   * and cannot switch them mid-stream.
   */
  private reconnectForPlaybackChange(preserveServerTimestamp = false): void {
    if (this.disposed) return;

    // A user seek/speed change supersedes the prior server timestamp; clear it so the resync honors the new intent.
    if (!preserveServerTimestamp) {
      this.latestServerTimestampMs = undefined;
    }

    const upgradeNeedsReconnect =
      this._isUpgraded || this.upgradeRetryAc !== null;
    if (upgradeNeedsReconnect) {
      this.disposeUpgradeInternal();
    }

    this.disposeBaseInternal();
    this.updateState(PeerState.connecting);
    this.connectBase();

    if (upgradeNeedsReconnect) {
      this.connectUpgrade();
    }
  }

  /**
   * Reconnect the base PC to recover from a fatal MSE error.
   * Disposes the broken MseRenderer and tears down the base PC — connectBase()
   * will create a new signaling session which triggers a fresh MseRenderer.
   */
  private reconnectMse(): void {
    if (this.disposed) return;

    // Dispose the broken MseRenderer so initMseRenderer() can create a fresh one.
    if (this.mseRenderer && !this.mseRenderer.disposed) {
      this.mseRenderer.dispose();
    }
    this.mseRenderer = null;

    this.disposeBaseInternal();
    this.updateState(PeerState.connecting);
    this.connectBase();
  }

  /** Create and wire an MseRenderer for the given MIME type. */
  private initMseRenderer(mime: string): void {
    if (this.mseRenderer || this.disposed) return;

    this.mseRenderer = new MseRenderer({ mime });
    // Cascade disposal: when CameraConnection aborts, dispose MseRenderer.
    const renderer = this.mseRenderer;
    this.signal.addEventListener('abort', () => {
      if (!renderer.disposed) renderer.dispose();
    });

    this.mseRenderer.on('stream', (stream) => {
      this.baseMediaStream = stream;
      if (!this._isUpgraded) {
        const track = stream.getVideoTracks()[0];
        if (track) {
          this.swapManagedTrack(track, this.basePc ?? undefined);
          this.emit('track', {
            track,
            streams: [this.managedStream],
          } as TrackEventDetail);
        }
      }
    });

    this.mseRenderer.on('error', (err) => {
      this.config.logger?.error?.(
        `[${this.connectionKey}] MseRenderer error:`,
        err,
      );

      // Fatal MSE error — the SourceBuffer is detached and the pipeline
      // cannot recover. Dispose the renderer and reconnect the base PC
      // to reinitialize the MediaSource from scratch.
      if (err instanceof MseRecoveryError) {
        this.config.logger?.warn?.(
          `[${this.connectionKey}] MSE pipeline broken, reconnecting base`,
        );
        this.reconnectMse();
      }
    });
  }

  // ── Private: quality polling ──────────────────────────────────────────

  private async pollQuality(): Promise<void> {
    if (this.disposed) return;

    // Update viewport-based focus score (synchronous).
    this.qualityMonitor.updateFocus();

    // Collect RTCStats from the active peer connection.
    const pc = this.activePc;
    if (!pc) return;

    let stats: RTCStatsReport;
    try {
      stats = await pc.getStats();
    } catch {
      // getStats can fail if the PC is closing — not actionable.
      return;
    }

    let bytesReceived = 0;
    let jitter = 0;
    let rtt = 0;
    let packetsLost = 0;
    let packetsReceived = 0;

    for (const report of stats.values()) {
      if (report.type === 'inbound-rtp' && (report as any).kind === 'video') {
        bytesReceived = (report as any).bytesReceived ?? 0;
        jitter = (report as any).jitter ?? 0;
        packetsLost = (report as any).packetsLost ?? 0;
        packetsReceived = (report as any).packetsReceived ?? 0;
      }
      if (
        report.type === 'candidate-pair' &&
        (report as any).state === 'succeeded'
      ) {
        rtt = (report as any).currentRoundTripTime ?? 0;
      }
    }

    this.qualityMonitor.updateStats({
      rtt,
      jitter,
      packetsLost,
      packetsReceived,
      bytesReceived,
    });
  }
}
