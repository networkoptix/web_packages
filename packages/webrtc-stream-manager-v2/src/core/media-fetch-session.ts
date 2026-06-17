// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Disposable } from './disposable';
import { PeerConnectionWrapper } from './peer-connection';
import { withRetry, type RetryConfig } from '../strategies/retry-policy';
import { linkSignal } from '../utils/abort-helpers';
import { diagTracker } from '../utils/diag-tracker';
import {
  ConnectionError,
  PeerState,
  type DeliveryMethodEventDetail,
  type Logger,
  type StateChangeEventDetail,
  type TimestampEventDetail,
} from '../types';

// ─── Config ─────────────────────────────────────────────────────────────────

export interface MediaFetchSessionConfig {
  /** Diag key, kept distinct from the pooled camera entry's timeline. */
  sessionKey: string;
  /**
   * Builds the signaling URL. Re-invoked per attempt (retries included) so
   * each gets a fresh single-use ticket (~10 s expiry).
   */
  signalingUrl: () => string | Promise<string>;
  iceServers?: RTCIceServer[];
  /** Parent signal for cascade disposal. */
  parentSignal?: AbortSignal;
  logger?: Logger;
  /** Override the bounded initial-connect retry. */
  retry?: Partial<RetryConfig>;
}

// ─── Event types ────────────────────────────────────────────────────────────

interface MediaFetchSessionEventMap {
  /** Raw fMP4 bytes: init segment first, then moof/mdat. */
  buffer: ArrayBuffer;
  timestamp: TimestampEventDetail;
  deliverymethod: DeliveryMethodEventDetail;
  /** Server confirmation of a DC command (e.g. seek echo). */
  confirmation: undefined;
  statechange: StateChangeEventDetail;
  /** Post-connect connection loss. The session does NOT reconnect. */
  error: ConnectionError;
  /** Data channel open — seek/pause/resume are ready. */
  dcopen: undefined;
  datachannel: string | ArrayBuffer;
}

type MediaFetchSessionEvent = keyof MediaFetchSessionEventMap;

// ─── Defaults ───────────────────────────────────────────────────────────────

/** Bounded retry for the initial connect — fail fast, the owner decides. */
const FETCH_RETRY: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 10_000,
};

// ─── MediaFetchSession ──────────────────────────────────────────────────────

/**
 * A single-shot, data-only media session: one {@link PeerConnectionWrapper}
 * delivering raw `buffer` / `timestamp` events plus seek/pause/resume verbs,
 * used for companion fetches (e.g. encoded-sample backfill while the visible
 * tile is paused). No renderer, no quality monitoring, and deliberately no
 * reconnect: {@link connect} retries boundedly then rejects, and a
 * post-connect failure emits `error` once and stays down — the owner
 * disposes it and opens a fresh session.
 */
export class MediaFetchSession extends Disposable {
  readonly sessionKey: string;

  private readonly config: MediaFetchSessionConfig;
  private readonly retryConfig: RetryConfig;
  private readonly emitter = new EventTarget();

  private pcw: PeerConnectionWrapper | null = null;
  private pcwCleanups: (() => void)[] = [];
  private connectPromise: Promise<void> | null = null;
  /** Terminal: connect exhausted, post-connect loss, or DC closed. */
  private failed = false;
  /** First-wins guard — the PCW may emit MimeInit from two sites. */
  private deliveryMethodSeen = false;

  constructor(config: MediaFetchSessionConfig) {
    super();
    this.config = config;
    this.sessionKey = config.sessionKey;
    this.retryConfig = config.retry
      ? { ...FETCH_RETRY, ...config.retry }
      : FETCH_RETRY;

    if (config.parentSignal) {
      this.linkTo(config.parentSignal);
    }

    this.onDispose(() => this.teardownPcw());
  }

  // ── Public getters ────────────────────────────────────────────────────

  get state(): PeerState {
    if (this.failed || this.disposed) {
      return PeerState.failed;
    }
    return this.pcw?.state ?? PeerState.connecting;
  }

  get dataChannelOpen(): boolean {
    return this.pcw?.dataChannelOpen ?? false;
  }

  /**
   * MSE MIME type from the server's MimeInit (e.g. `video/mp4;
   * codecs="avc1.640028"`). Set once {@link connect} resolves in MSE mode;
   * undefined for SRTP delivery, which sends no MimeInit.
   */
  get mime(): string | undefined {
    return this.pcw?.deliveryMethod?.mime;
  }

  // ── Public event API ──────────────────────────────────────────────────

  on(event: 'buffer', listener: (data: ArrayBuffer) => void): () => void;
  on(
    event: 'timestamp',
    listener: (detail: TimestampEventDetail) => void,
  ): () => void;
  on(
    event: 'deliverymethod',
    listener: (detail: DeliveryMethodEventDetail) => void,
  ): () => void;
  on(event: 'confirmation', listener: () => void): () => void;
  on(
    event: 'statechange',
    listener: (detail: StateChangeEventDetail) => void,
  ): () => void;
  on(event: 'error', listener: (error: ConnectionError) => void): () => void;
  on(event: 'dcopen', listener: () => void): () => void;
  on(
    event: 'datachannel',
    listener: (data: string | ArrayBuffer) => void,
  ): () => void;
  on(
    event: MediaFetchSessionEvent,
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

  /**
   * Open the session. Resolves on `connected`; rejects once the bounded
   * retry is exhausted or the session is disposed mid-connect. Single-shot:
   * repeated calls return the same promise, and a failed connect stays
   * failed — create a new session to retry.
   */
  connect(): Promise<void> {
    this.throwIfDisposed();
    if (!this.connectPromise) {
      this.connectPromise = this.connectInternal();
    }
    return this.connectPromise;
  }

  /**
   * Seek to an archive position (ms). Archive-to-archive only — the session
   * opened with a position baked into its URL, so no live↔archive boundary.
   * @returns false if the data channel is not open yet.
   */
  seek(positionMs: number): boolean {
    if (!this.pcw?.dataChannelOpen) {
      return false;
    }
    this.pcw.sendSeek(positionMs);
    return true;
  }

  /** Pause delivery. @returns false if the data channel is not open yet. */
  pause(): boolean {
    return this.pcw?.sendPause() ?? false;
  }

  /** Resume delivery. @returns false if the data channel is not open yet. */
  resume(): boolean {
    return this.pcw?.sendResume() ?? false;
  }

  // ── Private: connect flow ─────────────────────────────────────────────

  private async connectInternal(): Promise<void> {
    diagTracker.startCamera(this.sessionKey, {
      deliveryMethod: 'mse',
      initialStream: 'fetch',
    });

    const retryAc = new AbortController();
    linkSignal(this.signal, retryAc);

    let pcw: PeerConnectionWrapper;
    try {
      pcw = await withRetry(
        async () => {
          const signalingUrl = await this.config.signalingUrl();
          return this.awaitConnected(signalingUrl, retryAc.signal);
        },
        this.retryConfig,
        retryAc.signal,
      );
    } catch (err) {
      this.failed = true;
      throw err;
    }

    // Disposed while the last attempt was in flight.
    if (this.disposed) {
      pcw.dispose();
      throw new DOMException('aborted', 'AbortError');
    }

    this.attach(pcw);
  }

  private awaitConnected(
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
        diagConnectionKey: this.sessionKey,
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

  /**
   * Wire event forwarding from the connected PCW. MimeInit and dcopen can
   * both fire before this runs (during signaling), so they're replayed from
   * stored state below. `deliverymethod` is first-wins because the PCW emits
   * it from two sites; the `mime` getter is the stable source of truth.
   */
  private attach(pcw: PeerConnectionWrapper): void {
    this.pcw = pcw;

    this.pcwCleanups.push(
      pcw.on('buffer', (data) => this.emit('buffer', data)),
      pcw.on('timestamp', (detail) => this.emit('timestamp', detail)),
      pcw.on('deliverymethod', (detail) =>
        this.emitDeliveryMethodOnce(detail),
      ),
      pcw.on('confirmation', () => this.emit('confirmation', undefined)),
      pcw.on('datachannel', (data) => this.emit('datachannel', data)),
      pcw.on('dcopen', () => this.emit('dcopen', undefined)),
      // No media track here, so DC close is the only connection-loss signal.
      pcw.on('dcclose', () => this.emitTerminalError()),
      pcw.on('statechange', (detail) => {
        this.emit('statechange', detail);
        if (detail.state === PeerState.failed) {
          this.emitTerminalError();
        }
      }),
    );

    if (pcw.deliveryMethod) {
      this.emitDeliveryMethodOnce(pcw.deliveryMethod);
    }
    if (pcw.dataChannelOpen) {
      this.emit('dcopen', undefined);
    }
  }

  // ── Private: helpers ──────────────────────────────────────────────────

  private emit<K extends MediaFetchSessionEvent>(
    event: K,
    detail: MediaFetchSessionEventMap[K],
  ): void {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail }));
  }

  /** First-wins `deliverymethod` forwarding (see {@link attach}). */
  private emitDeliveryMethodOnce(detail: DeliveryMethodEventDetail): void {
    if (this.deliveryMethodSeen) {
      return;
    }
    this.deliveryMethodSeen = true;
    this.emit('deliverymethod', detail);
  }

  /** Emit `error` once and mark failed (both PeerState.failed and DC close route here). */
  private emitTerminalError(): void {
    if (this.failed || this.disposed) {
      return;
    }
    this.failed = true;
    this.emit('error', ConnectionError.lostConnection);
  }

  private teardownPcw(): void {
    for (const cleanup of this.pcwCleanups) cleanup();
    this.pcwCleanups = [];
    if (this.pcw && !this.pcw.disposed) {
      this.pcw.dispose();
    }
    this.pcw = null;

    const timeline = diagTracker.get(this.sessionKey);
    if (timeline) {
      timeline.disposed = true;
    }
  }
}
