// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

// Shared test doubles for the stepping/reverse suites: a real prefilled
// SampleStore, a MockFetcher (EventTarget + spied control surface), a
// MockDecoder (decoded-run cache model), and a ManualClock implementing
// PacerClock. FrameStepper, ReversePlayer, and PlaybackCoordinator tests all
// build on these.

import { vi } from 'vitest';

import { SampleStore } from '../../../src/stepping/sample-store';
import type { PacerClock } from '../../../src/stepping/reverse-player';

export const TIMESCALE = 15360;
export const T0 = 1_780_000_000_000;
/** One GOP = 5 samples of 512 ticks ≈ 166.7 ms; one sample ≈ 33.3 ms. */
export const SPAN_MS = (5 * 512 * 1000) / TIMESCALE;
export const SAMPLE_MS = (512 * 1000) / TIMESCALE;

export interface FakeFrame {
  ticks: number;
}

/**
 * Real store, prefilled with `gops` contiguous 5-sample GOPs ending near T0
 * (newest first: GOP 0 abuts T0, GOP n is one span older). A `gap` inserts a
 * recording hole between GOP 0 and the rest; `codecBoundary` gives the older
 * GOPs a second codec epoch. Two GOPs by default (the stepping suite's shape).
 */
export function makeStore(
  opts: { gap?: boolean; codecBoundary?: boolean; gops?: number } = {},
): SampleStore {
  const gops = opts.gops ?? 2;
  const store = new SampleStore({ timescale: TIMESCALE });
  const epochA = store.registerConfig({
    codec: 'avc1.420032',
    description: new Uint8Array([1, 0x42, 0x00, 0x32]),
  });
  const epochB = opts.codecBoundary
    ? store.registerConfig({ codec: 'avc1.640028', description: new Uint8Array([1, 0x64, 0x00, 0x28]) })
    : epochA;
  const gop = (n: number) => Array.from({ length: 5 }, (_, i) => {
    const dts = n * 5 * 512 + i * 512;
    return { dts, pts: dts, duration: 512, key: i === 0, bytes: new Uint8Array(100) };
  });
  const gapMs = opts.gap ? 500 : 0;
  for (let n = 0; n < gops; n++) {
    // Everything below GOP 0 shifts down by the gap (a single hole under the newest GOP).
    const shift = n >= 1 ? gapMs : 0;
    store.insertFragment(
      { seq: n + 1, trackId: 1, baseDts: n * 5 * 512, samples: gop(n) },
      { timestampMs: T0 - (n + 1) * SPAN_MS - shift, rtpTimestamp: n * 5 * 512 },
      n >= 1 ? epochB : epochA,
    );
  }
  return store;
}

/** Append one contiguous 5-sample GOP below the store's current oldest coverage. */
export function appendOlderGop(store: SampleStore, seq: number): void {
  const oldestTicks = store.coverage()[0].startTicks;
  const oldestMs = store.ticksToEpochMs(oldestTicks);
  const baseDts = seq * 5 * 512;
  const samples = Array.from({ length: 5 }, (_, i) => ({
    dts: baseDts + i * 512, pts: baseDts + i * 512,
    duration: 512, key: i === 0, bytes: new Uint8Array(100),
  }));
  // The new GOP's last sample abuts the current oldest sample (contiguous).
  const newTopMs = oldestMs - SAMPLE_MS;
  const startMs = newTopMs - 4 * SAMPLE_MS;
  store.insertFragment(
    { seq, trackId: 1, baseDts, samples },
    { timestampMs: startMs, rtpTimestamp: baseDts },
    0,
  );
}

export class MockFetcher {
  private emitter = new EventTarget();
  store: SampleStore | null;
  init = {
    tracks: [],
    encrypted: false,
    videoTrack: {
      id: 1, handler: 'vide', timescale: TIMESCALE, sampleEntry: 'avc1',
      width: 2048, height: 1536,
      decoderConfig: new Uint8Array([1, 2, 3]), hasEditList: false,
    },
  };
  mime = 'video/mp4; codecs="avc1.420032"';
  state = 'paused';
  stitchConflicts = 0;
  probing = false;
  private _windowMs = 10_000;
  private _fetchSpeed: number | undefined;

  openWindow = vi.fn().mockResolvedValue(undefined);
  openAtAnchor = vi.fn().mockResolvedValue(undefined);
  extendBack = vi.fn().mockResolvedValue(undefined);
  refetchHole = vi.fn().mockReturnValue(true);
  pauseDelivery = vi.fn();
  setWindowMs = vi.fn().mockImplementation((ms: number) => { this._windowMs = ms; });
  setFetchSpeed = vi.fn().mockImplementation((speed: number | undefined) => { this._fetchSpeed = speed; });
  /** Chunk-oracle verdict; null = spans unknown (instant hole jumps, the pre-oracle behavior). */
  spanIsGapFree = vi.fn().mockReturnValue(null);
  /** Chunk-oracle verdict for the archive-start gate; null = spans unknown. */
  hasRecordedDataBefore = vi.fn().mockReturnValue(null);

  constructor(store: SampleStore | null) {
    this.store = store;
  }

  get windowMs(): number {
    return this._windowMs;
  }

  get fetchSpeed(): number | undefined {
    return this._fetchSpeed;
  }

  on(event: string, listener: (...args: unknown[]) => void): () => void {
    const handler = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      if (detail !== undefined) listener(detail);
      else listener();
    };
    this.emitter.addEventListener(event, handler);
    return () => this.emitter.removeEventListener(event, handler);
  }

  emit(event: string, detail?: unknown): void {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail }));
  }
}

export class MockDecoder {
  static instances: MockDecoder[] = [];
  /** Shared across instances: a persistent fault survives dispose-and-recreate. */
  static globalFailNext = 0;
  failed = false;
  disposed = false;
  /** When true, cachedFrame hits for any tick (fully-warm cache — pacing tests). */
  alwaysHit = false;
  /** Overridable cache byte-length (byte-gate tests drive this directly). */
  cacheBytes = 0;
  byteCapBytes = 256 * 1024 * 1024;

  private decodedTicks = new Set<number>();

  frameAt = vi.fn().mockImplementation(
    async (run: { samples: { ticks: number }[]; targetIndex: number }) => {
      if (MockDecoder.globalFailNext > 0) {
        MockDecoder.globalFailNext--;
        this.failed = true;
        throw new Error('decode fault');
      }
      for (const s of run.samples) this.decodedTicks.add(s.ticks);
      return { ticks: run.samples[run.targetIndex].ticks } as FakeFrame;
    },
  );
  cachedFrame = vi.fn().mockImplementation((ticks: number) =>
    this.alwaysHit || this.decodedTicks.has(ticks) ? ({ ticks } as FakeFrame) : null,
  );
  trimAbove = vi.fn();
  trimBelow = vi.fn();
  dispose = vi.fn().mockImplementation(() => {
    this.disposed = true;
  });

  constructor(public timescale: number) {
    MockDecoder.instances.push(this);
  }

  get cacheByteLength(): number {
    return this.cacheBytes;
  }

  get byteCap(): number {
    return this.byteCapBytes;
  }

  /** Test helper: mark a set of ticks as already decoded (warm cache). */
  warm(ticks: number[]): void {
    for (const t of ticks) this.decodedTicks.add(t);
  }
}

/**
 * Deterministic {@link PacerClock}: a monotonic clock with an ordered pending
 * list. `advance(ms)` fires every callback due within the interval in time
 * order (a callback may reschedule during the sweep). Synchronous — decode
 * microtasks are settled by the test's own `await flush()`.
 */
export class ManualClock implements PacerClock {
  private t = 0;
  private seq = 0;
  private pending: { id: number; at: number; cb: () => void }[] = [];

  now(): number {
    return this.t;
  }

  setTimeout(cb: () => void, ms: number): unknown {
    const id = ++this.seq;
    this.pending.push({ id, at: this.t + Math.max(0, ms), cb });
    return id;
  }

  clearTimeout(handle: unknown): void {
    this.pending = this.pending.filter((p) => p.id !== handle);
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  advance(ms: number): void {
    const end = this.t + ms;
    for (;;) {
      let idx = -1;
      for (let i = 0; i < this.pending.length; i++) {
        if (this.pending[i].at <= end && (idx < 0 || this.pending[i].at < this.pending[idx].at)) {
          idx = i;
        }
      }
      if (idx < 0) break;
      const due = this.pending.splice(idx, 1)[0];
      this.t = due.at;
      due.cb();
    }
    this.t = end;
  }

  /**
   * Simulate a clamped / background-tab wake: jump the clock forward, THEN fire
   * every callback already overdue — each sees the late `now()`. Callbacks that
   * reschedule land in the future and do not re-fire this pass.
   */
  advanceLate(ms: number): void {
    this.t += ms;
    const due = this.pending
      .filter((p) => p.at <= this.t)
      .sort((a, b) => a.at - b.at);
    this.pending = this.pending.filter((p) => p.at > this.t);
    for (const d of due) d.cb();
  }
}

export const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

export const msOf = (store: SampleStore, ticks: number): number => store.ticksToEpochMs(ticks);
