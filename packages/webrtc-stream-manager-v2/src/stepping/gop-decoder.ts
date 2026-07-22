// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import type { Logger } from '../types';
import type { SampleConfig, StoreSample } from './sample-store';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GopDecoderConfig {
  /** Track timescale (ticks/second) for µs timestamp conversion. */
  timescale: number;
  /** Decoded-frame cache cap. Default 256 MB. */
  byteCapBytes?: number;
  /** Coded dimensions from the init segment — failure diagnostics only. */
  codedWidth?: number;
  codedHeight?: number;
  logger?: Logger;
}

/** A key-led contiguous sample run plus the config it must decode under. */
export interface DecodeRun {
  samples: StoreSample[];
  targetIndex: number;
  config: SampleConfig;
}

/** Structured post-mortem of a decode failure for one-pass root-causing. */
export interface DecodeFailureSnapshot {
  /** Epoch ms when the failure was recorded. */
  at: number;
  phase: 'unsupported-config' | 'invalid-run' | 'decode' | 'decoder-error' | 'missing-target';
  errorName: string;
  errorMessage: string;
  codec: string;
  descriptionByteLength: number;
  /** First 16 description bytes as hex (avcC profile/level live here). */
  descriptionHead: string;
  timescale: number;
  codedWidth: number | null;
  codedHeight: number | null;
  sampleCount: number;
  targetIndex: number;
  firstTicks: number | null;
  lastTicks: number | null;
  keySampleIndices: number[];
  /** Dimensions of the last frame this decoder successfully output. */
  lastOutput: { codedWidth: number; codedHeight: number } | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_BYTE_CAP = 256 * 1024 * 1024;
const DESCRIPTION_HEAD_BYTES = 16;

/** Cache-entry byte cost; GPU-opaque frames that refuse allocationSize() fall back to the NV12 estimate (≈1.5 B/px). */
function frameByteCost(frame: VideoFrame): number {
  try {
    if (typeof frame.allocationSize === 'function') {
      return frame.allocationSize();
    }
  } catch {
    // Opaque format — fall through to the estimate.
  }
  return frame.codedWidth * frame.codedHeight * 1.5;
}

function hexHead(bytes: Uint8Array): string {
  return Array.from(bytes.slice(0, DESCRIPTION_HEAD_BYTES), (b) => b.toString(16).padStart(2, '0'))
    .join(' ');
}

interface CacheEntry {
  frame: VideoFrame;
  /** Byte cost captured at insert, so eviction accounting stays symmetric. */
  bytes: number;
}

// ─── GopDecoder ─────────────────────────────────────────────────────────────

/**
 * Wraps one `VideoDecoder` and a byte-capped decoded-frame cache keyed on
 * archive ticks. The caller passes the governing key-led run; every decoded
 * frame is cached and the target returned.
 *
 * Ownership: the cache owns and closes every VideoFrame; callers must paint
 * the returned frame SYNCHRONOUSLY and never close it — a later insert's
 * eviction can close any handed-out frame, so holding one across an await is
 * invalid.
 *
 * The cache is deliberately NOT purged on a mid-session codec reconfigure:
 * a tick belongs to one codec epoch, so frames decoded under the old config
 * stay correct to serve.
 */
export class GopDecoder {
  /** Most recent failure page-wide; survives disposal so a post-mortem probe can read it. */
  static lastDecodeFailure: DecodeFailureSnapshot | null = null;

  private readonly config: GopDecoderConfig;
  private readonly byteCap_: number;
  private decoder: VideoDecoder | null = null;
  private active: SampleConfig | null = null;
  /** Presentation-ordered tick queue, zipped against decoder outputs. */
  private expectedTicks: number[] = [];
  private cache = new Map<number, CacheEntry>();
  private cacheBytes = 0;
  private chain: Promise<unknown> = Promise.resolve();
  private _failed = false;
  private _disposed = false;
  /** The serialized run in flight (runs never overlap), for failure context. */
  private currentRun: DecodeRun | null = null;
  /** Stops the generic catch-block snapshot from overwriting a precise one. */
  private runFailureRecorded = false;
  private lastOutput: { codedWidth: number; codedHeight: number } | null = null;
  private _lastDecodeFailure: DecodeFailureSnapshot | null = null;

  constructor(config: GopDecoderConfig) {
    this.config = config;
    this.byteCap_ = config.byteCapBytes ?? DEFAULT_BYTE_CAP;
  }

  /** Probe support without constructing (HW session exhaustion shows here). */
  static async isSupported(codec: string, description: Uint8Array): Promise<boolean> {
    if (typeof VideoDecoder === 'undefined') return false;
    try {
      const support = await VideoDecoder.isConfigSupported({
        codec,
        description: description as BufferSource,
      });
      return support.supported === true;
    } catch {
      return false;
    }
  }

  get failed(): boolean {
    return this._failed;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  get cachedFrameCount(): number {
    return this.cache.size;
  }

  get cacheByteLength(): number {
    return this.cacheBytes;
  }

  /** Decoded-frame cache byte cap (the paced reverse presenter byte-gates prefetch against it). */
  get byteCap(): number {
    return this.byteCap_;
  }

  /** Post-mortem of this instance's most recent failure (survives dispose). */
  get lastDecodeFailure(): DecodeFailureSnapshot | null {
    return this._lastDecodeFailure;
  }

  /** The cached frame at exactly `ticks`, or null. Paint synchronously (see class doc). */
  cachedFrame(ticks: number): VideoFrame | null {
    return this.cache.get(ticks)?.frame ?? null;
  }

  /** Decode `run` and return its target frame. Runs are serialized; cache hits skip the decoder. Paint synchronously. */
  frameAt(run: DecodeRun): Promise<VideoFrame> {
    if (this._failed) return Promise.reject(new Error('GopDecoder failed'));
    if (this._disposed) return Promise.reject(new Error('GopDecoder disposed'));
    const target = run.samples[run.targetIndex];
    const hit = this.cache.get(target.ticks);
    if (hit) return Promise.resolve(hit.frame);

    const queued: Promise<VideoFrame> = this.chain.then(() => this.decodeRun(run));
    // Keep the chain alive past rejections so later runs still execute.
    this.chain = queued.catch((): undefined => undefined);
    return queued;
  }

  /** Close and evict every cached frame with ticks > `ticks`. */
  trimAbove(ticks: number): void {
    for (const [t, entry] of this.cache) {
      if (t > ticks) {
        this.cacheBytes -= entry.bytes;
        entry.frame.close();
        this.cache.delete(t);
      }
    }
  }

  /** Close and evict every cached frame with ticks < `ticks`. */
  trimBelow(ticks: number): void {
    for (const [t, entry] of this.cache) {
      if (t < ticks) {
        this.cacheBytes -= entry.bytes;
        entry.frame.close();
        this.cache.delete(t);
      }
    }
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.clearCache();
    if (this.decoder && this.decoder.state !== 'closed') {
      try {
        this.decoder.close();
      } catch {
        // Already closed by an error.
      }
    }
    this.decoder = null;
    this.active = null;
  }

  // ── Private ───────────────────────────────────────────────────────────

  private async decodeRun(run: DecodeRun): Promise<VideoFrame> {
    if (this._disposed) throw new Error('GopDecoder disposed');
    if (this._failed) throw new Error('GopDecoder failed');
    const target = run.samples[run.targetIndex];

    // Re-check: an earlier queued run may have already cached the target.
    const hit = this.cache.get(target.ticks);
    if (hit) return hit.frame;

    if (!run.samples.length || !run.samples[0].key) {
      throw this.recordFailure(
        'invalid-run',
        new Error('decode run must start at a sync sample'),
        run,
      );
    }

    this.currentRun = run;
    this.runFailureRecorded = false;
    try {
      const decoder = await this.ensureConfigured(run);

      // VideoDecoder emits in presentation order, so a pts-sorted tick queue zips exactly.
      this.expectedTicks = run.samples
        .map((s) => s.ticks)
        .sort((a, b) => a - b);

      for (const sample of run.samples) {
        decoder.decode(new EncodedVideoChunk({
          type: sample.key ? 'key' : 'delta',
          // Informational only — pairing uses expectedTicks, not this timestamp.
          timestamp: Math.round((sample.ticks * 1_000_000) / this.config.timescale),
          data: sample.bytes as BufferSource,
        }));
      }
      await decoder.flush();
    } catch (err) {
      // Skip if disposed (teardown, not a failure) or a precise snapshot already exists.
      if (!this.runFailureRecorded && !this._disposed) {
        this.recordFailure('decode', err, run);
      }
      throw err;
    } finally {
      this.currentRun = null;
    }

    if (this._disposed) throw new Error('GopDecoder disposed');
    if (this._failed) throw new Error('GopDecoder failed');

    const entry = this.cache.get(target.ticks);
    if (!entry) {
      // A swallowed frame desyncs the tick-pairing for the whole run; purge
      // rather than risk serving a wrong-ticks frame.
      this._failed = true;
      this.clearCache();
      throw this.recordFailure(
        'missing-target',
        new Error('decode run produced no frame for the target sample'),
        run,
      );
    }
    return entry.frame;
  }

  /**
   * Return the live decoder, reconfiguring on a codec boundary. Every
   * (re)configure is gated on `isConfigSupported` first, so an unsupported
   * config fails with its reason instead of an opaque decoder fault.
   */
  private async ensureConfigured(run: DecodeRun): Promise<VideoDecoder> {
    const config = run.config;
    if (
      this.decoder
      && this.decoder.state === 'configured'
      && this.active
      && this.active.codec === config.codec
      && this.active.description.byteLength === config.description.byteLength
      && this.active.description.every((b, i) => b === config.description[i])
    ) {
      return this.decoder;
    }
    const supported = await GopDecoder.isSupported(config.codec, config.description);
    if (this._disposed) {
      throw new Error('GopDecoder disposed');
    }
    if (!supported) {
      throw this.recordFailure(
        'unsupported-config',
        new Error(`codec not supported by WebCodecs: ${config.codec}`),
        run,
      );
    }
    if (this.decoder && this.decoder.state !== 'closed') {
      this.decoder.close();
    }
    const decoder = new VideoDecoder({
      output: (frame) => this.onFrame(frame),
      error: (e) => {
        this._failed = true;
        this.recordFailure('decoder-error', e, this.currentRun);
      },
    });
    decoder.configure({
      codec: config.codec,
      description: config.description as BufferSource,
    });
    this.decoder = decoder;
    this.active = config;
    return decoder;
  }

  private onFrame(frame: VideoFrame): void {
    const ticks = this.expectedTicks.shift();
    if (ticks === undefined || this._disposed) {
      frame.close();
      return;
    }
    this.lastOutput = { codedWidth: frame.codedWidth, codedHeight: frame.codedHeight };
    const existing = this.cache.get(ticks);
    if (existing) {
      existing.frame.close();
      this.cacheBytes -= existing.bytes;
    }
    const bytes = frameByteCost(frame);
    this.cache.set(ticks, { frame, bytes });
    this.cacheBytes += bytes;
    this.evictToCap(ticks);
  }

  /** FIFO-evict to the byte cap, never the frame just inserted. */
  private evictToCap(justInserted: number): void {
    if (this.cacheBytes <= this.byteCap_) return;
    for (const [t, entry] of this.cache) {
      if (this.cacheBytes <= this.byteCap_) break;
      if (t === justInserted) continue;
      this.cacheBytes -= entry.bytes;
      entry.frame.close();
      this.cache.delete(t);
    }
  }

  private clearCache(): void {
    for (const entry of this.cache.values()) {
      entry.frame.close();
    }
    this.cache.clear();
    this.cacheBytes = 0;
  }

  /** Capture the snapshot (instance + static), log at warn, return the Error to throw. */
  private recordFailure(
    phase: DecodeFailureSnapshot['phase'],
    err: unknown,
    run: DecodeRun | null,
  ): Error {
    // DOMException is not `instanceof Error` everywhere — read off any error-shaped object.
    const shaped = typeof err === 'object' && err !== null && 'message' in err
      ? (err as { name?: unknown; message: unknown })
      : null;
    const errorName = shaped ? String(shaped.name ?? 'Error') : 'Error';
    const errorMessage = shaped ? String(shaped.message) : String(err);
    const error = err instanceof Error ? err : new Error(errorMessage);
    const config = run?.config ?? this.active;
    const lastSample = run ? run.samples[run.samples.length - 1] : undefined;
    const snapshot: DecodeFailureSnapshot = {
      at: Date.now(),
      phase,
      errorName,
      errorMessage,
      codec: config?.codec ?? 'unknown',
      descriptionByteLength: config?.description.byteLength ?? 0,
      descriptionHead: config ? hexHead(config.description) : '',
      timescale: this.config.timescale,
      codedWidth: this.config.codedWidth ?? null,
      codedHeight: this.config.codedHeight ?? null,
      sampleCount: run?.samples.length ?? 0,
      targetIndex: run?.targetIndex ?? -1,
      firstTicks: run?.samples[0]?.ticks ?? null,
      lastTicks: lastSample?.ticks ?? null,
      keySampleIndices: run ? run.samples.flatMap((s, i) => (s.key ? [i] : [])) : [],
      lastOutput: this.lastOutput,
    };
    this.runFailureRecorded = true;
    this._lastDecodeFailure = snapshot;
    GopDecoder.lastDecodeFailure = snapshot;
    this.config.logger?.warn?.('[GopDecoder] decode failure', snapshot);
    return error;
  }
}
