// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Disposable } from './disposable';
import {
  CameraConnection,
  type CameraConnectionConfig,
} from './camera-connection';
import { MediaFetchSession } from './media-fetch-session';
import type { RetryConfig } from '../strategies/retry-policy';
import { LRUCache } from '../utils/lru-cache';
import { TTLCache } from '../utils/ttl-cache';
import { fetchWithRedirectAuthorization } from '../utils/relay-fetch';
import { RadassController, type RadassHost, type CameraInfo } from '../strategies/radass-controller';
import { DEFAULT_RADASS_CONFIG, type RadassConfig } from '../strategies/radass-types';
import {
  AvailableStreams,
  TargetStream,
  isNativeWebRtcCodec,
  type DeliveryMethod,
  type WebRtcUrlConfig,
  type Logger,
} from '../types';
import { getNonTranscodingStreams } from '../utils/streams';
import { diagTracker } from '../utils/diag-tracker';
import { RelayPrefixPool } from '../utils/relay-prefix-pool';

// ─── Config ─────────────────────────────────────────────────────────────────

export interface StreamManagerConfig {
  /** Relay URL template, e.g. "{systemId}.relay.vmsproxy.com" */
  relayUrl: string;
  /** Whether to prefix relay URL for multiple WebSocket connections. */
  useRelayPrefix: boolean;
  /** Max seconds behind live before reconnect. */
  maxBehind: number;
  /** Use unreliable data channel. */
  useUnreliableDataChannel: boolean;
  /** Optional logger (defaults to none). Pass `console` or a custom {@link Logger}. */
  logger?: Logger;
  /** ICE servers for WebRTC. */
  iceServers?: RTCIceServer[];
  /** Max concurrent high-res streams. Overrides radassConfig.maxConcurrentHighRes if both set. */
  maxConcurrentHighRes?: number;
  /** RADASS configuration. Partial overrides merged with defaults. */
  radassConfig?: Partial<RadassConfig>;
}

/** Options for {@link StreamManager.createFetchSession}. */
export interface FetchSessionOptions {
  /** Archive position (epoch ms) baked into the URL. Nonzero; archive-only. */
  positionMs: number;
  /** Default 1. */
  speed?: number | 'unlimited';
  /** Default PRIMARY. */
  stream?: AvailableStreams;
  /** Default 'mse'. */
  deliveryMethod?: DeliveryMethod;
  retry?: Partial<RetryConfig>;
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_LRU_CAPACITY = 100;
const RELAY_HOST_CACHE_TTL_MS = 5 * 60 * 1_000; // 5 min

/**
 * Min spacing between per-camera fetch-session opens (delays, never rejects).
 * Caps a re-anchor feedback loop that re-opened sessions ~1 Hz and degraded
 * the camera; a real pause→step→resume cycle is at most delayed by this.
 */
const FETCH_SESSION_MIN_OPEN_INTERVAL_MS = 2_000;

/** Default STUN servers used when no iceServers are provided.
 *  Required so the browser generates SRFLX candidates — the mediaserver's
 *  IceRelay waits for a remote SRFLX before creating the TURN permission
 *  and sending its relay candidate back.  Without SRFLX the TURN relay
 *  never activates and ICE connectivity through the cloud relay fails. */
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.stunprotocol.org:3478' },
];

// ─── StreamManager ──────────────────────────────────────────────────────────

/**
 * Global singleton that manages all {@link CameraConnection} instances,
 * delegates quality decisions to {@link RadassController}, and provides
 * the high-level API for the WebRTC stream management layer.
 *
 * Connections are held in an {@link LRUCache} with an eviction callback
 * that disposes evicted connections — fixing the v1 memory leak where
 * abandoned connections were never properly closed.
 *
 * Quality optimization is handled by the RADASS (Resolution Adaptive
 * Dynamic Streaming Strategy) controller, which runs periodic ticks to
 * promote/demote connections based on element size, MOS performance,
 * camera count, and concurrent stream caps.
 */
export class StreamManager extends Disposable {
  // ── Singleton ───────────────────────────────────────────────────────────

  private static _instance: StreamManager | null = null;

  /**
   * Initialize the singleton with the given config. Must be called before
   * {@link getInstance}. Calling again replaces the previous instance
   * (disposing it first).
   */
  static configure(config: StreamManagerConfig): void {
    if (StreamManager._instance) {
      StreamManager._instance.dispose();
    }
    StreamManager._instance = new StreamManager(config);
  }

  /**
   * Return the configured singleton instance.
   * @throws if {@link configure} has not been called.
   */
  static getInstance(): StreamManager {
    if (!StreamManager._instance) {
      throw new Error(
        'StreamManager not configured. Call StreamManager.configure() first.',
      );
    }
    return StreamManager._instance;
  }

  /**
   * Reset the singleton (dispose current instance if any).
   * Primarily for testing cleanup.
   */
  static reset(): void {
    if (StreamManager._instance) {
      StreamManager._instance.dispose();
      StreamManager._instance = null;
    }
  }

  // ── Instance state ──────────────────────────────────────────────────────

  private readonly _config: Readonly<StreamManagerConfig>;
  private readonly connections: LRUCache<CameraConnection>;
  private readonly camerasNeedingMse = new Set<string>();
  private readonly relayHostCache = new TTLCache<string>(RELAY_HOST_CACHE_TTL_MS);
  private readonly relayPrefixPool = new RelayPrefixPool();
  private readonly radassController: RadassController;
  private _playing = true;
  private _currentPosition: number | undefined;
  private _currentSpeed: number | 'unlimited' = 1;
  /** Live fetch sessions — the per-camera budget ledger (newest-wins). */
  private readonly fetchSessions = new Map<string, MediaFetchSession>();
  /** Per-camera earliest next fetch-session open, in performance.now() time. */
  private readonly fetchOpenNotBefore = new Map<string, number>();
  /** Monotonic suffix keeping fetch-session diag timelines distinct. */
  private fetchSessionSeq = 0;

  /**
   * Create a new StreamManager instance.
   *
   * Most consumers should use the static {@link configure} / {@link getInstance}
   * singleton workflow. The constructor is public to support testing (e.g. creating
   * isolated instances per test) and advanced multi-instance scenarios.
   */
  constructor(config: StreamManagerConfig) {
    super();

    this._config = Object.freeze({
      ...config,
      iceServers: config.iceServers ?? DEFAULT_ICE_SERVERS,
    });

    // LRU cache with disposal on eviction — fixes the v1 P0 memory leak.
    // The onEvict callback fires when LRU capacity is exceeded and the
    // least-recently-used connection is silently dropped.
    this.connections = new LRUCache<CameraConnection>(
      DEFAULT_LRU_CAPACITY,
      (_key, connection) => {
        connection.dispose();
      },
    );

    // RADASS controller: owns all stream quality decisions.
    const radassConfig: RadassConfig = {
      ...DEFAULT_RADASS_CONFIG,
      ...config.radassConfig,
    };
    // Preserve backwards compat for maxConcurrentHighRes
    if (config.maxConcurrentHighRes !== undefined) {
      radassConfig.maxConcurrentHighRes = config.maxConcurrentHighRes;
    }

    const host: RadassHost = {
      getCameraInfo: (key: string): CameraInfo | null => {
        const connection = this.connections.get(key);
        if (!connection) return null;
        return {
          targetStream: connection.targetStream,
          snapshot: connection.qualitySnapshot(),
          elementHeight: connection.qualityMonitor.getElementHeight(),
          elementArea: connection.qualityMonitor.getElementArea(),
          viewportAreaFraction: connection.qualityMonitor.getViewportAreaFraction(),
          canAutoUpgrade: connection.canAutoUpgrade,
          statsUpdateCount: connection.qualityMonitor.getStatsUpdateCount(),
        };
      },
      applyDirective: (key: string, quality: 'high' | 'low'): void => {
        const connection = this.connections.get(key);
        if (!connection) return;

        // Pause is handled inside RadassController (it freezes all adaptive
        // decisions while !isPlaying), so no upgrade/downgrade guard is needed
        // here — the controller never issues an adaptive directive while paused.
        if (quality === 'high') {
          connection.requestHighRes();
        } else {
          connection.releaseHighRes();
        }
      },
      isPlaying: (): boolean => this._playing,
    };

    this.radassController = new RadassController(radassConfig, host);

    // Cleanup on dispose.
    this.onDispose(() => {
      this.radassController.dispose();
      this.disposeAllConnections();
      this.relayHostCache.clear();
      // Fetch sessions cascade-dispose via parentSignal; just drop the ledger.
      this.fetchSessions.clear();
      this.fetchOpenNotBefore.clear();
      // Only clear the singleton reference if this is still the current instance.
      // When configure() replaces the instance, the old one is disposed but the
      // new one should not be cleared.
      if (StreamManager._instance === this) {
        StreamManager._instance = null;
      }
    });

  }

  // ── Public getters ──────────────────────────────────────────────────────

  /** The frozen configuration used to initialize this instance. */
  get config(): Readonly<StreamManagerConfig> {
    return this._config;
  }

  /** Whether the manager is in a playing state (optimizer upgrades only when playing). */
  get playing(): boolean {
    return this._playing;
  }

  // ── Connection management ───────────────────────────────────────────────

  /**
   * Get or create a {@link CameraConnection} for the given camera config.
   *
   * If a connection already exists for the camera key, it is returned
   * (promoted in the LRU cache). Otherwise a new connection is created.
   *
   * @param urlConfig - Camera connection parameters.
   * @param videoElement - Optional video element for viewport focus tracking.
   * @returns The active {@link CameraConnection}.
   */
  connect(
    urlConfig: WebRtcUrlConfig,
    videoElement?: HTMLVideoElement,
  ): CameraConnection {
    this.throwIfDisposed();
    const _diagStart = performance.now();
    const connectionKey = this.buildConnectionKey(urlConfig);
    this._config.logger?.info?.(`[WEBRTC-DIAG] [${connectionKey}] StreamManager.connect() begin`, { targetStream: urlConfig.targetStream, t: _diagStart });

    // Return existing connection if available (promotes in LRU).
    // If targetStream changed, tear down and recreate — the connection's
    // base/upgrade streams and available set may differ for the new target.
    const existing = this.connections.get(connectionKey);
    if (existing) {
      const newTarget = urlConfig.targetStream ?? TargetStream.AUTO;
      if (existing.targetStream !== newTarget) {
        this.disconnect(connectionKey);
      } else {
        if (videoElement) {
          existing.setVideoElement(videoElement);
        }
        return existing;
      }
    }

    // Determine available streams (what the camera physically has).
    const availableStreams = this.resolveAvailableStreams(urlConfig);
    this._config.logger?.info?.(`[WEBRTC-DIAG] [${connectionKey}] available streams resolved`, { availableStreams, elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });

    // Determine which stream to start with (based on codec viability).
    const initialStream = this.resolveInitialStream(urlConfig, availableStreams);
    this._config.logger?.info?.(`[WEBRTC-DIAG] [${connectionKey}] initial stream selected`, { initialStream, elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });

    // Determine if the quality optimizer can auto-upgrade this connection.
    // Auto-upgrade is only viable when base=SECONDARY (so upgrade=PRIMARY)
    // and PRIMARY doesn't require transcoding.
    const canAutoUpgrade = this.resolveCanAutoUpgrade(
      urlConfig,
      initialStream,
      availableStreams,
    );
    this._config.logger?.info?.(`[WEBRTC-DIAG] [${connectionKey}] canAutoUpgrade decision`, { canAutoUpgrade, elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });

    // Build the CameraConnection config.
    const needsMse = this.camerasNeedingMse.has(connectionKey);
    const connectionConfig: CameraConnectionConfig = {
      connectionKey,
      signalingUrl: (stream: AvailableStreams, deliveryMethod?: DeliveryMethod, enableMetadata?: boolean) =>
        this.buildSignalingUrl(urlConfig, stream, deliveryMethod ?? 'srtp', enableMetadata),
      availableStreams,
      initialStream,
      canAutoUpgrade,
      targetStream: urlConfig.targetStream ?? TargetStream.AUTO,
      iceServers: this._config.iceServers,
      parentSignal: this.signal,
      logger: this._config.logger,
      mediaStreams: urlConfig.mediaStreams,
      needsMse,
      enableMetadata: true,
      initialPosition: this._currentPosition,
      initialSpeed: this._currentSpeed,
    };

    // Start diagnostic tracking for this camera.
    diagTracker.startCamera(connectionKey, {
      initialStream: initialStream === AvailableStreams.PRIMARY ? 'PRIMARY' : 'SECONDARY',
      deliveryMethod: needsMse ? 'mse' : 'srtp',
    });

    const connection = new CameraConnection(connectionConfig);

    // Flip _isPaused synchronously; dcopen-resync replays it when the new
    // PC's DC opens. Without this, a connection added during global pause plays.
    if (!this._playing) {
      connection.sendPause();
    }

    // Cache cameras that need MSE so reconnects skip SRTP.
    connection.on('msefallback', () => {
      this.camerasNeedingMse.add(connectionKey);
      const dt = diagTracker.get(connectionKey);
      if (dt) dt.mseFallback = true;
    });

    // Store in LRU cache.
    this.connections.set(connectionKey, connection);
    this.radassController.registerCamera(connectionKey);

    if (videoElement) {
      connection.setVideoElement(videoElement);
    }

    return connection;
  }

  /**
   * Retrieve an existing connection by key without creating one.
   * Returns `null` if no connection exists for the key.
   */
  getConnection(connectionKey: string): CameraConnection | null {
    this.throwIfDisposed();
    return this.connections.get(connectionKey) ?? null;
  }

  /**
   * Disconnect and dispose a specific camera connection.
   */
  disconnect(connectionKey: string): void {
    this.throwIfDisposed();
    const connection = this.connections.get(connectionKey);
    if (connection) {
      this.radassController.unregisterCamera(connectionKey);
      this.connections.delete(connectionKey);
      this.camerasNeedingMse.delete(connectionKey);
      connection.dispose();
    }
  }

  /**
   * Remove a connection from the cache WITHOUT disposing it.
   *
   * The caller takes ownership and must call {@link CameraConnection.dispose}
   * manually when done (e.g. after a replacement connection is ready).
   * This enables seamless quality transitions where the old stream keeps
   * playing until the new one has produced its first frames.
   */
  detach(connectionKey: string): CameraConnection | null {
    this.throwIfDisposed();
    const connection = this.connections.get(connectionKey);
    if (connection) {
      this.radassController.unregisterCamera(connectionKey);
      this.connections.delete(connectionKey);
      return connection;
    }
    return null;
  }

  /**
   * Create a dedicated, **unpooled** data-only session for a camera: no LRU
   * caching, no quality optimizer, no global position/speed/pause broadcasts
   * — playback params come from `options`, baked into the URL.
   *
   * The caller owns the session and must dispose it (disposing the manager
   * cascades). Each session is a real server session on the relay budget, so:
   * at most one per camera (a new one supersedes the previous, newest-wins)
   * and opens are paced per {@link FETCH_SESSION_MIN_OPEN_INTERVAL_MS}.
   */
  createFetchSession(
    urlConfig: WebRtcUrlConfig,
    options: FetchSessionOptions,
  ): MediaFetchSession {
    this.throwIfDisposed();
    if (!options.positionMs) {
      throw new Error(
        'createFetchSession requires a nonzero archive positionMs',
      );
    }

    const connectionKey = this.buildConnectionKey(urlConfig);

    const previous = this.fetchSessions.get(connectionKey);
    if (previous) {
      this._config.logger?.warn?.(
        `[${connectionKey}] fetch-session budget: superseding ${previous.sessionKey} (newest-wins)`,
      );
      previous.dispose();
    }

    // Aborts a pending rate-limit delay if the session dies first, so a dead
    // session never claims its open slot.
    const openAbort = new AbortController();

    const session = new MediaFetchSession({
      sessionKey: `${connectionKey}:fetch#${++this.fetchSessionSeq}`,
      signalingUrl: async () => {
        await this.waitForFetchOpenSlot(connectionKey, openAbort.signal);
        return this.buildSignalingUrl(
          urlConfig,
          options.stream ?? AvailableStreams.PRIMARY,
          options.deliveryMethod ?? 'mse',
          false,
          {
            positionMs: options.positionMs,
            speed: options.speed ?? 1,
          },
        );
      },
      iceServers: this._config.iceServers,
      parentSignal: this.signal,
      logger: this._config.logger,
      retry: options.retry,
    });

    this.fetchSessions.set(connectionKey, session);
    session.signal.addEventListener(
      'abort',
      () => {
        openAbort.abort();
        if (this.fetchSessions.get(connectionKey) === session) {
          this.fetchSessions.delete(connectionKey);
        }
      },
      { once: true },
    );

    return session;
  }

  // ── Global controls ─────────────────────────────────────────────────────

  /**
   * Update playback position for all connections.
   * @param positionMs - Playback position in milliseconds. Undefined or 0
   *   means live; both propagate to connections as 0 so they can detect a
   *   live↔archive boundary flip and reconnect when needed.
   */
  updatePosition(positionMs?: number): void {
    this.throwIfDisposed();
    this._currentPosition = positionMs;
    const perConnection = positionMs ?? 0;
    this.forEachConnection((connection) => {
      connection.updatePosition(perConnection);
    });
  }

  /**
   * Update playback position for a specific camera.
   * @param cameraId - Object with id and systemId identifying the camera.
   * @param positionMs - Playback position in milliseconds.
   */
  updateCameraPosition(
    cameraId: { id: string; systemId: string },
    positionMs: number,
  ): void {
    this.throwIfDisposed();
    const connectionKey = `${cameraId.systemId}:${cameraId.id}`;
    const connection = this.connections.get(connectionKey);
    if (connection) {
      connection.updatePosition(positionMs);
    }
  }

  /**
   * Update playback speed for all connections.
   */
  updateSpeed(speed: number | 'unlimited'): void {
    this.throwIfDisposed();
    this._currentSpeed = speed;
    this.forEachConnection((connection) => {
      connection.updateSpeed(speed);
    });
  }

  /**
   * Toggle the playing state. When paused, RADASS freezes all adaptive quality
   * decisions (no upgrades and no downgrades — see CLOUD-18235) and a DC pause
   * command is dispatched to every connection.
   */
  togglePlaying(): void {
    this.setPlaying(!this._playing);
  }

  /** Explicitly set the playing state (used by pause/play facade methods). */
  setPlaying(playing: boolean): void {
    this.throwIfDisposed();
    this._playing = playing;
    this.forEachConnection((connection) => {
      if (playing) {
        connection.sendResume();
      } else {
        connection.sendPause();
      }
    });
  }

  /**
   * Cache a resolved relay host for the given system.
   *
   * Call this when external code (e.g. the demo's oneTimeToken factory)
   * discovers the data plane host via redirect. WebSocket URLs use the
   * multiplexing `---` prefix which only resolves on the data plane, not
   * the relay router, so the library needs to know the resolved host.
   */
  setResolvedRelayHost(
    systemId: string,
    host: string,
    serverId?: string,
  ): void {
    this.throwIfDisposed();
    // Cache per-server when serverId is provided. Different servers in the
    // same system may route to different data planes, and the WebSocket `---`
    // prefix DNS only resolves on the correct data plane.  Per-server caching
    // avoids one server's data plane overwriting another's.
    const key = serverId ? `${systemId}:${serverId}` : systemId;
    this.relayHostCache.set(key, host);
  }

  /** Advance all connections by one frame (only meaningful when paused). */
  nextFrame(): void {
    this.throwIfDisposed();
    this.forEachConnection((connection) => {
      connection.sendNextFrame();
    });
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────

  /**
   * Dispose all connections and the StreamManager itself.
   */
  async closeAll(): Promise<void> {
    await this.dispose();
  }

  // ── Private: helpers ────────────────────────────────────────────────────

  /**
   * Build the connection key from a URL config.
   * Format: `{systemId}:{cameraId}` to match v1 behavior.
   */
  private buildConnectionKey(urlConfig: WebRtcUrlConfig): string {
    return `${urlConfig.systemId}:${urlConfig.cameraId}`;
  }

  /**
   * Delay until the camera's fetch-open slot is free, then claim it. Each
   * connect attempt (retries included) claims a slot; an aborted wait does
   * not, so a dead session leaves the slot for the next opener.
   */
  private async waitForFetchOpenSlot(
    connectionKey: string,
    signal: AbortSignal,
  ): Promise<void> {
    if (signal.aborted) {
      throw new DOMException('aborted', 'AbortError');
    }
    const waitMs =
      (this.fetchOpenNotBefore.get(connectionKey) ?? 0) - performance.now();
    if (waitMs > 0) {
      this._config.logger?.warn?.(
        `[${connectionKey}] fetch-session open rate-limited — delaying ${Math.ceil(waitMs)}ms`,
      );
      await new Promise<void>((resolve, reject) => {
        const id = globalThis.setTimeout(() => {
          signal.removeEventListener('abort', onAbort);
          resolve();
        }, waitMs);

        function onAbort(): void {
          globalThis.clearTimeout(id);
          reject(new DOMException('aborted', 'AbortError'));
        }

        signal.addEventListener('abort', onAbort, { once: true });
      });
    }
    if (signal.aborted) {
      throw new DOMException('aborted', 'AbortError');
    }
    this.fetchOpenNotBefore.set(
      connectionKey,
      performance.now() + FETCH_SESSION_MIN_OPEN_INTERVAL_MS,
    );
  }

  /**
   * Resolve which streams the camera physically has.
   *
   * This returns the full set of streams the device supports — it does NOT
   * filter by codec viability. Codec-based decisions (which stream to start
   * on, whether auto-upgrade is viable) are handled separately by
   * {@link resolveInitialStream} and {@link resolveCanAutoUpgrade}.
   */
  private resolveAvailableStreams(
    urlConfig: WebRtcUrlConfig,
  ): AvailableStreams[] {
    // 1. If explicitly provided by the caller, trust those.
    if (urlConfig.availableStreams && urlConfig.availableStreams.length > 0) {
      return urlConfig.availableStreams;
    }

    // 2. Derive from mediaStreams device data.
    if (urlConfig.mediaStreams?.length) {
      return urlConfig.mediaStreams.map((s) => s.encoderIndex);
    }

    // 3. No device data — default to both (primary is always available).
    return [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY];
  }

  /**
   * Determine which stream to connect first as the always-on base connection.
   *
   * Decision logic:
   * - Explicit HIGH → PRIMARY
   * - Explicit LOW → SECONDARY
   * - AUTO → cheapest non-transcoding stream as the persistent base:
   *   - SECONDARY if non-transcoding (cheap low-res base)
   *   - PRIMARY if SECONDARY requires transcoding
   *   - SECONDARY if all streams require transcoding (cheaper to transcode)
   */
  private resolveInitialStream(
    urlConfig: WebRtcUrlConfig,
    availableStreams: AvailableStreams[],
  ): AvailableStreams {
    // Explicit target overrides auto-detection.
    if (urlConfig.targetStream === TargetStream.HIGH) {
      return availableStreams.includes(AvailableStreams.PRIMARY)
        ? AvailableStreams.PRIMARY
        : availableStreams[0];
    }
    if (urlConfig.targetStream === TargetStream.LOW) {
      return availableStreams.includes(AvailableStreams.SECONDARY)
        ? AvailableStreams.SECONDARY
        : availableStreams[0];
    }

    // AUTO: use codec data to pick the best persistent base stream.
    if (urlConfig.mediaStreams?.length) {
      const nonTranscoding = getNonTranscodingStreams(urlConfig.mediaStreams);
      if (nonTranscoding?.includes(AvailableStreams.SECONDARY)) {
        // SECONDARY is non-transcoding — cheapest persistent base.
        return AvailableStreams.SECONDARY;
      }
      if (nonTranscoding?.length) {
        // Only PRIMARY is non-transcoding — use it as base.
        return nonTranscoding[0];
      }
      // All streams require transcoding — SECONDARY is cheaper to transcode.
      return availableStreams.includes(AvailableStreams.SECONDARY)
        ? AvailableStreams.SECONDARY
        : availableStreams[0];
    }

    // No codec data — default to SECONDARY if available.
    return availableStreams.includes(AvailableStreams.SECONDARY)
      ? AvailableStreams.SECONDARY
      : availableStreams[0];
  }

  /**
   * Determine if the quality optimizer can auto-upgrade this connection.
   *
   * Auto-upgrade is only viable when:
   * 1. Base stream is SECONDARY (so upgrade = PRIMARY, higher resolution)
   * 2. PRIMARY is physically available on the camera
   * 3. PRIMARY doesn't require transcoding (or no codec data available)
   */
  private resolveCanAutoUpgrade(
    urlConfig: WebRtcUrlConfig,
    initialStream: AvailableStreams,
    availableStreams: AvailableStreams[],
  ): boolean {
    // Upgrade is only meaningful from SECONDARY → PRIMARY.
    if (initialStream !== AvailableStreams.SECONDARY) return false;
    if (!availableStreams.includes(AvailableStreams.PRIMARY)) return false;

    // No codec data — assume PRIMARY is non-transcoding.
    if (!urlConfig.mediaStreams?.length) return true;

    // Check if PRIMARY requires transcoding.
    const primary = urlConfig.mediaStreams.find(
      (s) => s.encoderIndex === AvailableStreams.PRIMARY,
    );
    return !primary || isNativeWebRtcCodec(primary.codec);
  }

  /**
   * Build the signaling WebSocket URL for a given stream.
   *
   * Uses the REST v3 API endpoint format:
   * `wss://{host}/rest/v3/devices/{cameraId}/webrtc?...&deliveryMethod=srtp&_ticket={ticket}`
   *
   * Each call generates a fresh random prefix (for connection multiplexing)
   * and fetches a fresh one-time ticket (single-use, ~10s expiry).
   *
   * The WSS host is computed AFTER the ticket fetch because the ticket
   * request may discover the resolved data plane host via redirect. The
   * multiplexing `---` prefix DNS wildcard only exists on the data plane,
   * not the relay router, so WebSocket URLs must use the resolved host.
   */
  private async buildSignalingUrl(
    urlConfig: WebRtcUrlConfig,
    stream: AvailableStreams,
    deliveryMethod: DeliveryMethod = 'srtp',
    enableMetadata?: boolean,
    playback?: { positionMs: number; speed: number | 'unlimited' },
  ): Promise<string> {
    const _diagStart = performance.now();
    const _diagKey = `${urlConfig.systemId}:${urlConfig.cameraId}`;
    this._config.logger?.info?.(`[WEBRTC-DIAG] [${_diagKey}] buildSignalingUrl begin`, { stream, deliveryMethod, t: _diagStart });
    // 1. Get relay host for the ticket request (may be template or cached).
    const apiRelayHost = this.getRelayHost(
      urlConfig.systemId,
      urlConfig.serverId,
    );

    // 2. Build the REST v3 endpoint path.
    const endpoint = `/rest/v3/devices/${urlConfig.cameraId}/webrtc`;

    // 3. Build query parameters.
    const params: string[] = [];

    if (urlConfig.serverId) {
      params.push(`x-server-guid=${urlConfig.serverId}`);
    }

    // Companion sessions inject their own playback params; pooled
    // connections use the manager's shared position/speed state.
    const positionMs = playback ? playback.positionMs : this._currentPosition;
    if (positionMs) {
      params.push(`positionMs=${positionMs}`);
    }

    const speed = playback ? playback.speed : this._currentSpeed;
    if (speed !== 1) {
      params.push(`speed=${speed === 'unlimited' ? 0 : speed}`);
    }

    params.push(`stream=${stream}`);
    params.push(`deliveryMethod=${deliveryMethod}`);

    if (enableMetadata) {
      params.push('enableMetadata=true');
    }

    // 4. Fetch one-time ticket for authentication.
    //    This may populate the relay host cache via redirect discovery
    //    (either from the library's own fetch or from the demo's
    //    oneTimeToken factory calling setResolvedRelayHost).
    const _diagTicketStart = performance.now();
    diagTracker.milestone(_diagKey, 'ticketFetchStartMs');
    diagTracker.phaseStart(_diagKey, 'ticketFetch');
    const ticket = await this.fetchOneTimeTicket(urlConfig, apiRelayHost);
    diagTracker.milestone(_diagKey, 'ticketFetchEndMs');
    diagTracker.phaseEnd(_diagKey, 'ticketFetch');
    this._config.logger?.info?.(`[WEBRTC-DIAG] [${_diagKey}] one-time ticket fetched`, { ticketFetchMs: (performance.now() - _diagTicketStart).toFixed(1) + 'ms', elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });
    params.push(`_ticket=${ticket}`);

    // Fetch sessions force a reliable channel regardless of config: the
    // encoded-sample pipeline's no-loss guarantee needs ordered SCTP.
    if (this._config.useUnreliableDataChannel && !playback) {
      params.push('unreliableTransport=true');
    }

    // Cache-buster to ensure unique WebSocket connections.
    params.push(`_ignore=${StreamManager.generateRandomPrefix()}`);

    // 5. Build the WebSocket host AFTER ticket fetch so we use the resolved
    //    data plane host (the cache may have been populated during step 4).
    //    Prefixes are drawn from a fixed pool (round-robin) so the browser
    //    can reuse cached DNS lookups and TLS sessions across connections.
    //    Pool size of 12 × ~6 connections per origin ≈ 72 concurrent WS.
    const resolvedRelayHost = this.getRelayHost(
      urlConfig.systemId,
      urlConfig.serverId,
    );
    this._config.logger?.info?.(`[WEBRTC-DIAG] [${_diagKey}] resolved relay host`, { resolvedRelayHost, elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });
    const wsHost = this._config.useRelayPrefix
      ? `${this.relayPrefixPool.getPrefix(resolvedRelayHost)}---${resolvedRelayHost}`
      : resolvedRelayHost;

    return `wss://${wsHost}${endpoint}?${params.join('&')}`;
  }

  /**
   * Fetch a one-time authentication ticket for WebSocket connection.
   *
   * Checks for a pre-provided oneTimeToken in apiContext first (string or
   * factory function), falling back to `POST /rest/v3/login/tickets`.
   *
   * Uses the relay host cache to avoid repeated redirects. On 503 (relay
   * returning "unavailable"), the cache is invalidated and the request is
   * retried with the template URL so the relay can route to a different server.
   */
  private async fetchOneTimeTicket(
    urlConfig: WebRtcUrlConfig,
    relayHost: string,
  ): Promise<string> {
    const _diagStart = performance.now();
    const _diagKey = `${urlConfig.systemId}:${urlConfig.cameraId}`;
    this._config.logger?.info?.(`[WEBRTC-DIAG] [${_diagKey}] fetchOneTimeTicket begin`, { relayHost, t: _diagStart });
    // Check for pre-provided oneTimeToken in apiContext.
    if (
      'apiContext' in urlConfig &&
      urlConfig.apiContext?.oneTimeToken !== undefined
    ) {
      const tokenOrFactory = urlConfig.apiContext.oneTimeToken;
      return typeof tokenOrFactory === 'function'
        ? Promise.resolve(tokenOrFactory())
        : tokenOrFactory;
    }

    // Resolve the access token (may be a factory function).
    const accessToken =
      typeof urlConfig.accessToken === 'function'
        ? await Promise.resolve(urlConfig.accessToken())
        : urlConfig.accessToken ?? '';

    const serverParam = urlConfig.serverId
      ? `?x-server-guid=${urlConfig.serverId}`
      : '';
    const ticketUrl = `https://${relayHost}/rest/v3/login/tickets${serverParam}`;
    const init: RequestInit = {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}` },
    };

    const response = await fetchWithRedirectAuthorization(ticketUrl, init);
    this._config.logger?.info?.(`[WEBRTC-DIAG] [${_diagKey}] fetchOneTimeTicket response`, { status: response.status, elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });

    // 503: relay returned "unavailable" — cached host may be stale.
    // Invalidate cache and retry with the template URL.
    if (response.status === 503) {
      this._config.logger?.info?.(`[WEBRTC-DIAG] [${_diagKey}] fetchOneTimeTicket 503 fallback triggered`, { elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });
      this.relayHostCache.delete(urlConfig.systemId);
      if (urlConfig.serverId) {
        this.relayHostCache.delete(`${urlConfig.systemId}:${urlConfig.serverId}`);
      }
      const templateHost = this.getTemplateRelayHost(urlConfig.systemId);
      const fallbackUrl = `https://${templateHost}/rest/v3/login/tickets${serverParam}`;
      const fallbackResponse = await fetchWithRedirectAuthorization(
        fallbackUrl,
        init,
      );
      if (!fallbackResponse.ok) {
        throw new Error(
          `Ticket request failed with status ${fallbackResponse.status}`,
        );
      }
      this.cacheRelayHost(
        urlConfig.systemId,
        fallbackResponse,
        templateHost,
        urlConfig.serverId,
      );
      const fallbackData = await fallbackResponse.json();
      return fallbackData.token;
    }

    // Check response before parsing JSON.
    if (!response.ok) {
      throw new Error(
        `Ticket request failed with status ${response.status}`,
      );
    }

    // Cache the resolved relay host on successful redirect.
    this.cacheRelayHost(
      urlConfig.systemId,
      response,
      relayHost,
      urlConfig.serverId,
    );

    const data = await response.json();
    this._config.logger?.info?.(`[WEBRTC-DIAG] [${_diagKey}] fetchOneTimeTicket complete`, { elapsed: (performance.now() - _diagStart).toFixed(1) + 'ms' });
    return data.token;
  }

  /**
   * Get the relay host for a system, using the cached resolved host if
   * available, otherwise falling back to the template URL.
   */
  private getRelayHost(systemId: string, serverId?: string): string {
    // Prefer per-server cache (most specific), then per-system, then template.
    const serverKey = serverId ? `${systemId}:${serverId}` : undefined;
    return (
      (serverKey ? this.relayHostCache.get(serverKey) : undefined) ??
      this.relayHostCache.get(systemId) ??
      this._config.relayUrl.replace('{systemId}', systemId)
    );
  }

  /**
   * Get the template (uncached) relay host for a system.
   * Used as a fallback when the cached host returns 503.
   */
  private getTemplateRelayHost(systemId: string): string {
    return this._config.relayUrl.replace('{systemId}', systemId);
  }

  /**
   * Cache the resolved relay host by comparing the response URL with the
   * input host. If the response URL host differs from the input, a redirect
   * occurred and the resolved host is cached.
   *
   * Note: `response.redirected` is NOT reliable here because
   * {@link fetchWithRedirectAuthorization} retries at the redirect target
   * as a fresh fetch (so `redirected` is `false`). But `response.url` is
   * the data plane URL, which differs from the template input host.
   */
  private cacheRelayHost(
    systemId: string,
    response: Response,
    inputHost: string,
    serverId?: string,
  ): void {
    try {
      const resolvedHost = new URL(response.url).host;
      if (resolvedHost && resolvedHost !== inputHost) {
        const key = serverId ? `${systemId}:${serverId}` : systemId;
        this.relayHostCache.set(key, resolvedHost);
      }
    } catch {
      // Invalid URL — skip caching.
    }
  }

  /**
   * Generate a random alphanumeric prefix string.
   * Used for WebSocket connection multiplexing (bypass browser's
   * 6-connection-per-host limit) and as cache-busters.
   */
  private static generateRandomPrefix(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Iterate over all tracked connections without promoting them in the LRU.
   */
  private forEachConnection(
    callback: (connection: CameraConnection, key: string) => void,
  ): void {
    this.connections.forEach((connection, key) => {
      callback(connection, key);
    });
  }

  /**
   * Dispose all connections and clear the LRU cache and key tracking.
   * Called during {@link dispose} cleanup.
   */
  private disposeAllConnections(): void {
    this.connections.forEach((connection) => {
      connection.dispose();
    });
    this.connections.clear();
    this.camerasNeedingMse.clear();
  }
}
