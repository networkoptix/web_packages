// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Disposable } from './disposable';

// ─── Config ─────────────────────────────────────────────────────────────────

export interface MseRendererConfig {
  /** MIME type for the SourceBuffer, e.g. 'video/mp4; codecs="hev1.1.6.L93.B0"'. */
  mime: string;
  /** Buffer trimming interval in ms (default 5000). */
  trimIntervalMs?: number;
  /** Max seconds of buffered data to keep behind current playback (default 5). */
  maxBufferBehindS?: number;
  /** Max seconds of buffered data ahead of current playback (default 8). */
  maxBufferAheadS?: number;
}

// ─── Event types ────────────────────────────────────────────────────────────

interface MseRendererEventMap {
  stream: MediaStream;
  error: Error;
}

type MseRendererEvent = keyof MseRendererEventMap;

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TRIM_INTERVAL_MS = 5_000;
const DEFAULT_MAX_BUFFER_BEHIND_S = 5;
const DEFAULT_MAX_BUFFER_AHEAD_S = 8;
/** Hard cap on pending JS buffers — safety valve for when ahead-time check can't run. */
const MAX_PENDING_BUFFERS = 60;

/**
 * Signals that the MseRenderer's SourceBuffer has entered an unrecoverable
 * state and the MSE pipeline needs to be reinitialized (typically by
 * reconnecting the base PeerConnection).
 */
export class MseRecoveryError extends Error {
  constructor(message: string, public readonly cause: DOMException) {
    super(message);
    this.name = 'MseRecoveryError';
  }
}

// ─── MseRenderer ────────────────────────────────────────────────────────────

/**
 * Renders binary media chunks (from a WebRTC DataChannel) through the
 * MediaSource Extensions API, producing a standard {@link MediaStream} via
 * `HTMLVideoElement.captureStream()`.
 *
 * This allows MSE-delivered video to be consumed identically to SRTP tracks —
 * downstream code always receives a `MediaStream` regardless of delivery method.
 *
 * Lifecycle:
 * 1. Creates a hidden `<video>` element and attaches a `MediaSource`.
 * 2. On `sourceopen`, creates a `SourceBuffer` with the provided MIME type.
 * 3. Callers push `ArrayBuffer` chunks via {@link appendBuffer}.
 * 4. A periodic trim removes old buffered data behind the playback head.
 * 5. {@link captureStream} produces the `MediaStream` output.
 * 6. Disposal revokes the object URL, removes the SourceBuffer, and detaches
 *    the video element.
 */
export class MseRenderer extends Disposable {
  private readonly emitter = new EventTarget();
  private readonly video: HTMLVideoElement;
  private readonly mime: string;
  private readonly maxBufferBehindS: number;
  private readonly maxBufferAheadS: number;

  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private objectUrl: string | null = null;
  private _stream: MediaStream | null = null;
  private pendingBuffers: ArrayBuffer[] = [];
  private appending = false;

  constructor(config: MseRendererConfig) {
    super();

    this.mime = config.mime;
    this.maxBufferBehindS = config.maxBufferBehindS ?? DEFAULT_MAX_BUFFER_BEHIND_S;
    this.maxBufferAheadS = config.maxBufferAheadS ?? DEFAULT_MAX_BUFFER_AHEAD_S;

    // Create hidden video element for MSE playback.
    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.autoplay = true;
    this.video.playsInline = true;
    this.video.style.position = 'fixed';
    this.video.style.top = '-9999px';
    this.video.style.left = '-9999px';
    this.video.style.width = '1px';
    this.video.style.height = '1px';
    this.video.style.opacity = '0';
    this.video.style.pointerEvents = 'none';
    document.body.appendChild(this.video);

    this.initMediaSource();

    // Periodic buffer trimming.
    const trimInterval = config.trimIntervalMs ?? DEFAULT_TRIM_INTERVAL_MS;
    this.setInterval(() => this.trimBuffer(), trimInterval);

    // Disposal cleanup.
    this.onDispose(() => this.cleanup());
  }

  /** The output MediaStream produced by captureStream(). Null until sourceopen. */
  get stream(): MediaStream | null {
    return this._stream;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Append a binary media chunk to the SourceBuffer.
   * Chunks are queued if the SourceBuffer is currently updating.
   */
  appendBuffer(data: ArrayBuffer): void {
    if (this.disposed) return;

    if (!this.sourceBuffer || this.appending) {
      // Hard cap on pending JS buffers to bound memory when the
      // SourceBuffer can't keep up.
      if (this.pendingBuffers.length >= MAX_PENDING_BUFFERS) {
        this.pendingBuffers.shift();
      }
      this.pendingBuffers.push(data);
      return;
    }

    // If the SourceBuffer is already far enough ahead, skip — playback
    // will catch up and the next chunk will resume normal appending.
    if (this.getBufferedAheadTime() > this.maxBufferAheadS) {
      return;
    }

    this.appendNextBuffer(data);
  }

  /**
   * Register a listener for renderer events.
   * Returns a cleanup function that removes the listener.
   */
  on(event: 'stream', listener: (stream: MediaStream) => void): () => void;
  on(event: 'error', listener: (error: Error) => void): () => void;
  on(
    event: MseRendererEvent,
    listener: (...args: never[]) => void,
  ): () => void {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      (listener as (d: unknown) => void)(detail);
    };
    this.emitter.addEventListener(event, handler);
    return () => this.emitter.removeEventListener(event, handler);
  }

  // ── Private: MediaSource setup ──────────────────────────────────────────

  private initMediaSource(): void {
    this.mediaSource = new MediaSource();
    this.objectUrl = URL.createObjectURL(this.mediaSource);
    this.video.src = this.objectUrl;

    this.mediaSource.addEventListener('sourceopen', () => {
      if (this.disposed || !this.mediaSource) return;

      try {
        this.sourceBuffer = this.mediaSource.addSourceBuffer(this.mime);
        this.sourceBuffer.mode = 'sequence';

        this.sourceBuffer.addEventListener('updateend', () => {
          this.appending = false;
          this.flushPending();
        });

        // Defer captureStream() until the video has decoded metadata.
        // During sourceopen, no data has been appended yet so
        // captureStream() may return a stream with 0 video tracks.
        // loadedmetadata fires once the first chunk is decoded and
        // the video dimensions / tracks are available.
        this.video.addEventListener(
          'loadedmetadata',
          () => {
            if (!this.disposed) {
              this.captureOutputStream();
            }
          },
          { once: true },
        );

        // Flush any buffers that arrived before sourceopen.
        this.flushPending();
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private captureOutputStream(): void {
    // Start playback BEFORE captureStream() so the captured track
    // starts unmuted (producing frames). If play() is deferred,
    // the captured track may be permanently muted until the hidden
    // video begins playback, blocking swapManagedTrack's deferred removal.
    this.video.play().catch(() => {
      // Autoplay may be blocked; the stream is still valid for programmatic use.
    });

    try {
      // captureStream() is not in the official spec yet but is widely supported.
      const captureStream = (this.video as HTMLVideoElement & {
        captureStream?: (frameRate?: number) => MediaStream;
        mozCaptureStream?: (frameRate?: number) => MediaStream;
      });

      const stream =
        captureStream.captureStream?.() ?? captureStream.mozCaptureStream?.();

      if (stream) {
        this._stream = stream;
        this.emit('stream', stream);
      } else {
        this.emit('error', new Error('captureStream() not supported'));
      }
    } catch (err) {
      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  // ── Private: buffer management ──────────────────────────────────────────

  private appendNextBuffer(data: ArrayBuffer): void {
    if (this.disposed || !this.sourceBuffer) return;

    try {
      this.appending = true;
      this.sourceBuffer.appendBuffer(data);
    } catch (err) {
      this.appending = false;

      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        // Buffer full — force an immediate trim and re-queue this chunk.
        this.trimBuffer();
        this.pendingBuffers.unshift(data);
        return;
      }

      if (
        err instanceof DOMException &&
        err.name === 'InvalidStateError'
      ) {
        // SourceBuffer detached (MediaSource ended/closed). Emit a fatal
        // error so CameraConnection can reconnect the base PC.
        this.emit(
          'error',
          new MseRecoveryError('SourceBuffer detached — reinit required', err),
        );
        return;
      }

      this.emit('error', err instanceof Error ? err : new Error(String(err)));
    }
  }

  private flushPending(): void {
    if (this.disposed || !this.sourceBuffer || this.appending) return;

    // If we're already buffered far enough ahead, drop pending data
    // rather than growing the SourceBuffer unboundedly.  Playback will
    // catch up and the next incoming chunk will resume appending.
    if (this.getBufferedAheadTime() > this.maxBufferAheadS) {
      this.pendingBuffers.length = 0;
      return;
    }

    const next = this.pendingBuffers.shift();
    if (next) {
      this.appendNextBuffer(next);
    }
  }

  /** Seconds of decoded media buffered ahead of the current playback position. */
  private getBufferedAheadTime(): number {
    if (!this.sourceBuffer) return 0;
    const buffered = this.sourceBuffer.buffered;
    const currentTime = this.video.currentTime;
    for (let i = 0; i < buffered.length; i++) {
      if (currentTime >= buffered.start(i) && currentTime <= buffered.end(i)) {
        return buffered.end(i) - currentTime;
      }
    }
    return 0;
  }

  private trimBuffer(): void {
    if (
      this.disposed ||
      !this.sourceBuffer ||
      this.sourceBuffer.updating ||
      !this.mediaSource ||
      this.mediaSource.readyState !== 'open'
    ) {
      return;
    }

    const currentTime = this.video.currentTime;
    if (currentTime <= this.maxBufferBehindS) return;

    try {
      this.sourceBuffer.remove(0, currentTime - this.maxBufferBehindS);
    } catch {
      // remove() may throw if the SourceBuffer is in an invalid state.
    }
  }

  // ── Private: event emission ─────────────────────────────────────────────

  private emit<K extends MseRendererEvent>(
    event: K,
    detail: MseRendererEventMap[K],
  ): void {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail }));
  }

  // ── Private: cleanup ───────────────────────────────────────────────────

  private cleanup(): void {
    // Stop all tracks on the captured stream.
    if (this._stream) {
      for (const track of this._stream.getTracks()) {
        track.stop();
      }
      this._stream = null;
    }

    // Remove SourceBuffer.
    if (this.sourceBuffer && this.mediaSource?.readyState === 'open') {
      try {
        this.mediaSource.removeSourceBuffer(this.sourceBuffer);
      } catch {
        // May fail if already detached.
      }
    }
    this.sourceBuffer = null;

    // End the MediaSource stream.
    if (this.mediaSource?.readyState === 'open') {
      try {
        this.mediaSource.endOfStream();
      } catch {
        // May fail if already ended.
      }
    }
    this.mediaSource = null;

    // Revoke object URL.
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    // Remove video element from DOM.
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    if (this.video.parentNode) {
      this.video.parentNode.removeChild(this.video);
    }

    this.pendingBuffers = [];
  }
}
