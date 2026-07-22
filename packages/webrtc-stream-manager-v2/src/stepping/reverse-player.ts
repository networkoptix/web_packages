// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { GopDecoder, type DecodeRun } from './gop-decoder';
import type { BackfillFetcher } from './backfill-fetcher';
import type { CoverageInterval, SampleStore, StoreSample } from './sample-store';
import type { Logger } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Continuous reverse rates. All ≤ 4 ⇒ one fixed speed-4 fetch session (see {@link REVERSE_FETCH_SPEED}) serves them all. */
export type ReverseRate = -0.25 | -0.5 | -1 | -2 | -4;

/**
 * Injectable clock so the paced loop is deterministic under test. The real
 * loop keys wakeups to the next sample tick — never setInterval/rAF — so a
 * monotonic `now()` plus one-shot timers is the whole surface.
 */
export interface PacerClock {
  now(): number;
  setTimeout(cb: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export type ReversePlayerState = 'idle' | 'starting' | 'playing' | 'buffering' | 'disabled';

interface ReversePlayerEventMap {
  /** A decoded frame is ready to paint. The player's decoder cache owns it — paint synchronously. */
  frame: { epochMs: number; frame: VideoFrame };
  state: ReversePlayerState;
  /** Playback stopped on its own — the coordinator lands in stepping at the cursor (null: nothing ever painted). */
  autostopped: { reason: 'archive-start' | 'supply-stalled'; cursorEpochMs: number | null };
  /** The supply governor changed the effective pacing rate (both negative; effective ≤ requested in magnitude). */
  governed: { requestedRate: ReverseRate; effectiveRate: number };
  disabled: string;
}

type ReversePlayerEvent = keyof ReversePlayerEventMap;

export interface ReversePlayerConfig {
  /** Borrowed, shared with the FrameStepper (mode-exclusive consumers). */
  fetcher: BackfillFetcher;
  /** Decoder factory (the codec config rides each run). The player owns its own decoder. */
  createDecoder?: (timescale: number) => GopDecoder;
  /** Pacing clock. Default: performance.now + global timers. */
  clock?: PacerClock;
  /** Per-aim window while reversing (default {@link REVERSE_WINDOW_MS}). */
  windowMs?: number;
  /** Fetch-session speed while reversing (default {@link REVERSE_FETCH_SPEED}). */
  fetchSpeed?: number;
  logger?: Logger;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Long enough to amortize per-aim re-seek overhead while its encoded footprint stays a fraction of the store byte cap. */
const REVERSE_WINDOW_MS = 20_000;
/**
 * Fetch-session speed while reversing: supply must outrun the drain at every
 * supported rate (all |rate| ≤ 4). Applied on play() and restored on stop, so
 * stepping-only sessions keep their own (1×-reliable) default.
 */
const REVERSE_FETCH_SPEED = 4;
/** Keep a small band of decoded frames above the descending cursor (pause-instant frame + wobble). */
const TRIM_MARGIN_MS = 150;
/** Wake just past the tick crossing. */
const TICK_SLOP_MS = 1;
/** Prefetch only below this fraction of the decoder cache cap. */
const PREFETCH_BYTE_GUARD_FRACTION = 0.9;
/** Backstop on the per-paint prefetch walk (byte gate and decode-ahead target bound it first). */
const MAX_PREFETCH_GOPS = 8;
/** Cross-window placement tolerance, mirroring the store's EPSILON_MS. */
const EPSILON_MS = 1;

const ZERO_GROWTH_AIM_LIMIT = 2;
/** Extra aims allowed when the chunk oracle proves earlier data exists (each aim gap-hops). */
const GAP_HOP_RETRY_LIMIT = 2;
const LANDING_FAILURE_LIMIT = 2;
const REBUFFER_AIM_LIMIT = 3;
const SESSION_LOSS_LIMIT = 2;
const DECODER_FAILURE_LIMIT = 2;
/** Consecutive poisoned GOPs (each already retried on a fresh decoder) without one paint → the stream is undecodable. */
const POISONED_GOP_RUN_LIMIT = 3;
/** Hard bound on engaged-without-a-paint — comfortably above a healthy re-aim. */
const BUFFERING_WEDGE_TIMEOUT_MS = 10_000;
/** Cold-entry bound ('starting' → first paint): above a slow session open + one reseek cycle. */
const COLD_START_TIMEOUT_MS = 15_000;
/** Bounded walk when skipping below an undecodable seam (a few 4K GOPs' worth of samples). */
const MAX_SEAM_SKIP_SAMPLES = 400;

// ─── Supply governor ──────────────────────────────────────────────────────────
// When the server cannot sustain the requested rate, pace at what it CAN
// deliver instead of buffering to death. The control signal is the RUNWAY
// (contiguous coverage below the cursor) — the integral of supply − drain —
// so steering rate by runway settles at the equilibrium where drain matches
// delivery, with no explicit delivery-rate estimate (delivery arrives in
// bursty windows). The requested rate never changes (the slider is intent);
// supply acquisition is untouched (the fetch session always asks full speed),
// so recovery is automatic when delivery improves. Governing engages only
// AFTER starvation has manifested (a first honest buffering) and only while
// the fetcher is actively supplying: a short runway on a healthy session is
// normal (cold entry, the island above a recording hole), and a resting
// fetcher with a short runway means supply is NOT coming — slowing would
// crawl to the same end either way.

/** Below this, motion reads as frozen — honest buffering beats fake motion. */
const GOVERNOR_FLOOR = 0.25;
/** Runway at/below which the governor floors the rate. */
const GOVERNOR_LOW_RUNWAY_MS = 1_500;
/** Fraction of {@link headroomTargetMs} at/above which the requested rate runs ungoverned. */
const GOVERNOR_HIGH_FRACTION = 0.75;
/** Smoothing time-constant over the raw runway-derived rate (absorbs per-window sawtooth). */
const GOVERNOR_TAU_MS = 2_000;
/** Relative deadband: re-anchor only on meaningful rate changes. */
const GOVERNOR_DEADBAND = 0.1;
/** Shallow resume: leave buffering with this much contiguous runway; the governor ramps up from the floor. */
const RESUME_RUNWAY_MS = 2_000;
/** Hard cap on one no-paint spell even with delivery trickling in ('progress' extends the wedge bound up to this). */
const BUFFERING_TOTAL_BOUND_MS = 30_000;

/** Rate-scaled runway target: faster rates need proportionally more contiguous headroom. */
function headroomTargetMs(rate: ReverseRate): number {
  return Math.max(6_000, 3_000 * Math.abs(rate));
}

/** Decode-ahead band, scaled by the EFFECTIVE (not requested) rate so it tracks actual consumption; byte-gated. */
function decodeAheadMs(rateMagnitude: number): number {
  return 600 * rateMagnitude;
}

const defaultClock: PacerClock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
  setTimeout: (cb, ms) => globalThis.setTimeout(cb, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
};

// ─── ReversePlayer ──────────────────────────────────────────────────────────────

/**
 * Clock-paced continuous reverse presenter. Composes the same
 * {@link BackfillFetcher}/{@link SampleStore} as the FrameStepper (borrowed,
 * mode-exclusive) with its OWN {@link GopDecoder}. The pacing loop derives the
 * target archive tick from a wallclock↔archive anchor (drift-free) and keys one
 * wakeup to the next real sample tick; late wakes paint the floor sample (skip,
 * never slow-motion). Supply is kept ahead by widening the fetch window and
 * chaining {@link BackfillFetcher.extendBack}; when delivery can't sustain the
 * requested rate, a runway-driven governor paces at what the server CAN
 * deliver (slider intent unchanged, recovery automatic); starvation beyond the
 * governor's floor is honest `buffering`, bounded then autostopped INTO
 * stepping (never disabled for supply).
 */
export class ReversePlayer {
  private readonly config: ReversePlayerConfig;
  private readonly fetcher: BackfillFetcher;
  private readonly clock: PacerClock;
  private readonly windowMs: number;
  private readonly fetcherCleanups: (() => void)[] = [];
  private readonly emitter = new EventTarget();

  private decoder: GopDecoder | null = null;
  private decoderFailures = 0;
  /** Consecutive GOPs skipped for decode failure since the last successful paint. */
  private poisonedGopRun = 0;

  private _state: ReversePlayerState = 'idle';
  private _rate: ReverseRate = -1;
  /** Governed pacing-rate magnitude (≤ |_rate|). The pacer runs on THIS, never directly on the slider rate. */
  private effRate = 1;
  /** Time-smoothed runway-derived rate; null re-seeds on the next governor update. */
  private effRateEma: number | null = null;
  private govUpdatedAtMs: number | null = null;
  /** Armed by the first honest buffering of the run — the governor never slows a supply that has kept up so far. */
  private governorEngaged = false;
  /** Ticks of the last-painted sample (VFR-true), or null before the first paint. Survives stop() (cursor stays readable). */
  private cursorTicks: number | null = null;
  /** Drift-free pacing origin: wall time ↔ archive tick. Recomputed only on (re)anchor, never incremented. */
  private anchor: { wallMs: number; archiveTicks: number } | null = null;
  /** Stale timer/decode completions no-op past a bump. */
  private playToken = 0;
  private timer: unknown = null;
  /** One-shot bound on a continuous 'buffering' spell (see {@link BUFFERING_WEDGE_TIMEOUT_MS}). */
  private bufferingWatchdog: unknown = null;
  /** Start of the current no-paint spell — caps progress-extended watchdogs at {@link BUFFERING_TOTAL_BOUND_MS}. */
  private watchdogSpellStartMs: number | null = null;
  private watchdogBoundMs: number = BUFFERING_WEDGE_TIMEOUT_MS;
  /** Cold entry: aim in flight; first paint resolves on the anchor's delivery. */
  private pendingAnchorMs: number | null = null;
  /** Saved stepping window, restored on stop/autostop/disable. */
  private savedWindowMs: number | null = null;
  /** Saved stepping fetch speed, restored together with {@link savedWindowMs}. */
  private savedFetchSpeed: number | undefined;

  // ── Supply bookkeeping ─────────────────────────────────────────────────
  /** Lowest tick prefetched below the cursor. */
  private decodeAheadFloorTicks: number | null = null;
  /** Oldest covered tick at the last extend aim — zero-growth detector. */
  private extendFloorTicks: number | null = null;
  private zeroGrowthAims = 0;
  private rebufferAims = 0;
  private landingFailures = 0;
  private sessionLosses = 0;
  /** Aims spent chasing data the chunk oracle says exists below coverage. */
  private gapHopRetries = 0;
  /** The server cannot position earlier — drain the runway, then autostop archive-start. */
  private archiveStartConcluded = false;

  constructor(config: ReversePlayerConfig) {
    this.config = config;
    this.fetcher = config.fetcher;
    this.clock = config.clock ?? defaultClock;
    this.windowMs = config.windowMs ?? REVERSE_WINDOW_MS;

    this.fetcherCleanups.push(
      this.fetcher.on('progress', () => this.onProgress()),
      this.fetcher.on('windowcomplete', () => this.onWindowComplete()),
      this.fetcher.on('stalled', () => this.onStalled()),
      this.fetcher.on('landingfailed', () => this.onLandingFailed()),
      this.fetcher.on('noearlierdata', () => this.onNoEarlierData()),
      this.fetcher.on('conflictfailed', () => this.onConflictFailed()),
      this.fetcher.on('unsupported', (reason) => this.disable(`fetcher: ${reason}`)),
      this.fetcher.on('sessionlost', () => this.onSessionLost()),
    );
  }

  // ── Public getters ─────────────────────────────────────────────────────

  get state(): ReversePlayerState {
    return this._state;
  }

  get rate(): ReverseRate {
    return this._rate;
  }

  /** The governed rate actually pacing the loop (negative, |effectiveRate| ≤ |rate|). Equals `rate` on a healthy supply. */
  get effectiveRate(): number {
    return -this.effRate;
  }

  /** The last-painted sample's real archive tick, VFR-true. Readable after stop(). */
  get cursorEpochMs(): number | null {
    const store = this.fetcher.store;
    if (!store || this.cursorTicks === null) return null;
    return store.ticksToEpochMs(this.cursorTicks);
  }

  // ── Events ─────────────────────────────────────────────────────────────

  on(event: 'frame', listener: (detail: { epochMs: number; frame: VideoFrame }) => void): () => void;
  on(event: 'state', listener: (state: ReversePlayerState) => void): () => void;
  on(event: 'autostopped', listener: (detail: { reason: 'archive-start' | 'supply-stalled'; cursorEpochMs: number | null }) => void): () => void;
  on(event: 'governed', listener: (detail: { requestedRate: ReverseRate; effectiveRate: number }) => void): () => void;
  on(event: 'disabled', listener: (reason: string) => void): () => void;
  on(event: ReversePlayerEvent, listener: (...args: never[]) => void): () => void {
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

  // ── Public control ─────────────────────────────────────────────────────

  /**
   * Start (or re-anchor, if already active) reverse playback at `anchorMs`,
   * rate `rate`. Idempotent while playing — a fresh call is a scrub-in-reverse.
   */
  play(anchorMs: number, rate: ReverseRate): void {
    if (this._state === 'disabled') return;
    const wasIdle = this._state === 'idle';
    this._rate = rate;
    this.governorEngaged = false;
    this.resetGovernor();
    if (wasIdle) {
      this.savedWindowMs = this.fetcher.windowMs;
      this.fetcher.setWindowMs(this.windowMs);
      this.savedFetchSpeed = this.fetcher.fetchSpeed;
      this.fetcher.setFetchSpeed(this.config.fetchSpeed ?? REVERSE_FETCH_SPEED);
    }
    this.clearTimer();
    this.clearBufferingWatchdog(); // fresh aim, fresh grace
    this.playToken++;
    this.resetSupplyLadders();
    this.decoderFailures = 0;
    this.poisonedGopRun = 0;
    this.archiveStartConcluded = false;
    this.decodeAheadFloorTicks = null;
    this.pendingAnchorMs = null;
    this.setState('starting');
    // Same-state re-aim skips setState's arming — the fresh grace still needs a bound.
    this.armProgressWatchdog(COLD_START_TIMEOUT_MS);

    const store = this.fetcher.store;
    const anchorTicks = store ? store.epochMsToTicks(anchorMs) : null;
    // Warm only when the store actually COVERS the anchor. floorSample clamps to
    // the greatest sample below the anchor with no coverage check, so anchoring
    // above coverage (scrub forward during reverse) would silently snap back to
    // the stale coverage top and skip the archive in between.
    const floor = store && anchorTicks !== null && store.covers(anchorTicks)
      ? store.floorSample(anchorTicks)
      : null;
    if (store && floor) {
      // Warm: the runway is already covered — anchor here and paint frame 1.
      this.cursorTicks = floor.ticks;
      this.reanchorAt(floor.ticks);
      this.maybeExtendBack();
      this.present(floor, true);
    } else {
      // Cold: aim at the anchor (uncovered, in a gap, or no store yet); the
      // first paint resolves on delivery.
      this.cursorTicks = anchorTicks;
      this.pendingAnchorMs = anchorMs;
      void this.fetcher.openAtAnchor(anchorMs).catch((err) => {
        this.config.logger?.warn?.('[ReversePlayer] openAtAnchor failed', err);
      });
    }
  }

  /** Change rate presentation-only: re-anchor at the current target, keep the session. */
  setRate(rate: ReverseRate): void {
    if (this._state === 'idle' || this._state === 'disabled') return;
    if (rate === this._rate) return;
    const wasPlaying = this._state === 'playing';
    const t = this.anchor && this.fetcher.store
      ? this.targetTicks(this.clock.now())
      : this.cursorTicks;
    this._rate = rate;
    // A slider change is fresh intent: try the requested rate outright; the
    // governor pulls back within a few paints if supply still can't carry it.
    this.resetGovernor();
    if (t !== null) {
      this.anchor = { wallMs: this.clock.now(), archiveTicks: t };
      this.decodeAheadFloorTicks = null;
    }
    this.clearTimer();
    // Discard any in-flight decode from the old rate: without this its resolve
    // would run onTick and orphan the timer just armed below (a stray wakeup).
    this.playToken++;
    if (wasPlaying) this.scheduleNext();
    this.maybeExtendBack();
  }

  /** Stop → idle. Cursor stays readable; decoder disposed; stepping window restored. */
  stop(): void {
    if (this._state === 'idle' || this._state === 'disabled') return;
    this.teardown();
    this.setState('idle');
  }

  dispose(): void {
    this.teardown();
    if (this._state !== 'disabled') this.setState('idle');
    for (const cleanup of this.fetcherCleanups) cleanup();
    this.fetcherCleanups.length = 0;
  }

  // ── Pacing ─────────────────────────────────────────────────────────────

  /** Archive tick the presentation should be at, at wall time `t` (drift-free from the anchor, governed rate). */
  private targetTicks(t: number): number {
    const store = this.fetcher.store!;
    const anchor = this.anchor!;
    const elapsedArchiveMs = (t - anchor.wallMs) * this.effRate;
    return anchor.archiveTicks - store.epochMsToTicks(elapsedArchiveMs);
  }

  /** Wall time at which the target descends to `sTicks`. */
  private dueWallFor(sTicks: number): number {
    const store = this.fetcher.store!;
    const anchor = this.anchor!;
    const archiveMsBelow = store.ticksToEpochMs(anchor.archiveTicks - sTicks);
    return anchor.wallMs + archiveMsBelow / this.effRate;
  }

  private scheduleNext(): void {
    this.clearTimer();
    if (this._state !== 'playing') return;
    const store = this.fetcher.store;
    if (!store || this.cursorTicks === null || !this.anchor) return;
    const next = store.prevSample(this.cursorTicks);
    if (!next) {
      this.onRunwayExhausted();
      return;
    }
    if (!store.contiguous(next.ticks, this.cursorTicks)) {
      this.onHoleBelow(next);
      return;
    }
    const delay = Math.max(0, this.dueWallFor(next.ticks) - this.clock.now()) + TICK_SLOP_MS;
    this.timer = this.clock.setTimeout(() => this.onTick(), delay);
  }

  private onTick(): void {
    this.timer = null;
    if (this._state !== 'playing') return;
    const store = this.fetcher.store;
    if (!store || this.cursorTicks === null || !this.anchor) {
      this.enterBuffering();
      return;
    }
    const eps = this.epsilonTicks();
    const T = this.targetTicks(this.clock.now());
    if (T >= this.cursorTicks - eps) {
      // Target has not descended past the current frame yet — wait.
      this.scheduleNext();
      return;
    }
    const next = store.prevSample(this.cursorTicks);
    if (!next) {
      this.onRunwayExhausted();
      return;
    }
    if (!store.contiguous(next.ticks, this.cursorTicks)) {
      this.onHoleBelow(next);
      return;
    }
    // Contiguous runway: present the greatest contiguous sample ≤ T. The
    // scheduler wakes TICK_SLOP_MS (wall) past the crossing, i.e. |rate|·slop of
    // ARCHIVE time below `next` — undo that here so an on-time wake selects the
    // scheduled `next` exactly. Without it, a fixed 1 ms floor epsilon can't
    // absorb the rate-scaled slop at |rate|>1 and every other frame would drop.
    // A genuinely late wake still lands well below `next` and skips intermediate frames.
    let candidate = next;
    const floorTicks = T + store.epochMsToTicks(TICK_SLOP_MS * this.effRate);
    const floor = store.floorSample(floorTicks);
    if (floor && floor.ticks < this.cursorTicks - eps && store.contiguous(floor.ticks, next.ticks)) {
      candidate = floor;
    }
    this.present(candidate, false);
  }

  /**
   * Present sample `s`. Cache hit → paint synchronously. Miss → decode its GOP
   * (single in-flight, token-guarded); `direct` paints exactly `s` on resolve
   * (cold/warm entry, hole jump), otherwise the loop re-evaluates the target so
   * a slow decode catches up by skipping rather than running in slow motion.
   */
  private present(s: StoreSample, direct: boolean): void {
    const store = this.fetcher.store!;
    const decoder = this.ensureDecoder();
    if (!decoder) return;
    const cached = decoder.cachedFrame(s.ticks);
    if (cached) {
      this.paint(s, cached);
      return;
    }
    let target = s;
    let run = store.gopFor(target.ticks);
    if (!run) {
      // Covered but not decodable: no reachable governing keyframe, or a
      // wobble-poisoned seam the run walk barriers on. Extending back cannot
      // repair a LOCAL defect, so buffering here thrashes forever — skip down
      // to the nearest decodable keyframe instead (skip-don't-crawl).
      const below = this.nearestDecodableKeyBelow(target.ticks);
      if (!below) {
        this.enterBuffering();
        return;
      }
      if (this._state === 'playing' && this.anchor) {
        // A seam is always inside continuous coverage — skip the position but
        // hold the pace (instant chained skips teleport the playhead).
        this.scheduleDescentTo(below.sample);
        return;
      }
      // Cold/warm entry: paint immediately to establish the anchor.
      target = below.sample;
      run = below.run;
      this.reanchorAt(target.ticks);
      direct = true;
    }
    const paintTarget = target;
    const token = ++this.playToken;
    decoder.frameAt(run).then((frame) => {
      if (token !== this.playToken) return;
      if (this._state !== 'playing' && this._state !== 'starting') return;
      if (direct || this._state === 'starting') {
        this.paint(paintTarget, frame);
      } else {
        this.onTick();
      }
    }).catch((err) => {
      if (token !== this.playToken) return;
      this.onDecodeFailure(err, paintTarget);
    });
  }

  /**
   * Nearest keyframe at-or-below `ticks` whose GOP actually decodes — the
   * landing for skipping an undecodable seam. Bounded walk; null concedes to
   * honest buffering.
   */
  private nearestDecodableKeyBelow(
    ticks: number,
  ): { sample: StoreSample; run: DecodeRun } | null {
    const store = this.fetcher.store!;
    let s = store.prevSample(ticks);
    let walked = 0;
    while (s && walked++ < MAX_SEAM_SKIP_SAMPLES) {
      if (s.key) {
        const run = store.gopFor(s.ticks);
        if (run) return { sample: s, run };
      }
      s = store.prevSample(s.ticks);
    }
    return null;
  }

  private paint(s: StoreSample, frame: VideoFrame): void {
    const store = this.fetcher.store!;
    const decoder = this.decoder;
    this.clearBufferingWatchdog(); // a painted frame is the only real progress
    this.cursorTicks = s.ticks;
    this.decoderFailures = 0;
    this.poisonedGopRun = 0;
    if (this._state !== 'playing') this.setState('playing');
    this.emit('frame', { epochMs: store.ticksToEpochMs(s.ticks), frame });
    if (decoder) {
      decoder.trimAbove(s.ticks + store.epochMsToTicks(TRIM_MARGIN_MS));
    }
    store.evictToCap(s.ticks);
    this.maybeExtendBack();
    this.updateGovernor();
    this.maybePrefetch();
    this.scheduleNext();
  }

  private reanchorAt(ticks: number): void {
    this.anchor = { wallMs: this.clock.now(), archiveTicks: ticks };
    this.decodeAheadFloorTicks = null;
  }

  // ── Supply governor ────────────────────────────────────────────────────

  /** Fresh intent (play/setRate): run at the requested rate until the runway says otherwise. */
  private resetGovernor(): void {
    this.effRate = Math.abs(this._rate);
    this.effRateEma = null;
    this.govUpdatedAtMs = null;
  }

  /**
   * Recompute the effective rate from the runway (see the constants block for
   * the control law). Called on every paint and on fetcher progress — both
   * frequent while supply matters, both cheap.
   */
  private updateGovernor(): void {
    if (this._state !== 'playing') return;
    const store = this.fetcher.store;
    if (!store || this.cursorTicks === null) return;
    const requested = Math.abs(this._rate);
    const floorRate = Math.min(requested, GOVERNOR_FLOOR);
    // Govern only once starvation has manifested AND supply is actually in
    // flight (see the constants block for why both).
    const fetching = this.fetcher.state === 'collecting' || this.fetcher.state === 'opening';
    let raw = requested;
    if (this.governorEngaged && fetching && !this.archiveStartConcluded && floorRate < requested) {
      const interval = this.cursorInterval(store.coverage());
      const runwayMs = interval
        ? store.ticksToEpochMs(this.cursorTicks) - store.ticksToEpochMs(interval.startTicks)
        : 0;
      const high = GOVERNOR_HIGH_FRACTION * headroomTargetMs(this._rate);
      raw = runwayMs >= high
        ? requested
        : runwayMs <= GOVERNOR_LOW_RUNWAY_MS
          ? floorRate
          : floorRate + (requested - floorRate)
            * ((runwayMs - GOVERNOR_LOW_RUNWAY_MS) / (high - GOVERNOR_LOW_RUNWAY_MS));
    }
    const now = this.clock.now();
    if (this.effRateEma === null || this.govUpdatedAtMs === null) {
      this.effRateEma = raw;
    } else {
      const alpha = 1 - Math.exp(-Math.max(0, now - this.govUpdatedAtMs) / GOVERNOR_TAU_MS);
      this.effRateEma += alpha * (raw - this.effRateEma);
    }
    this.govUpdatedAtMs = now;
    let next = Math.min(requested, Math.max(floorRate, this.effRateEma));
    // Snap the asymptotic EMA tails onto the rail they approach.
    if (raw === requested && requested - next <= requested * GOVERNOR_DEADBAND) {
      next = requested;
    } else if (raw === floorRate && next - floorRate <= floorRate * GOVERNOR_DEADBAND) {
      next = floorRate;
    }
    if (next === this.effRate) return;
    // Deadband relative to the CURRENT rate — a fixed requested-scaled band
    // would wedge the ramp shy of the floor at high requested rates.
    if (next !== requested && next !== floorRate
      && Math.abs(next - this.effRate) < this.effRate * GOVERNOR_DEADBAND) {
      return;
    }
    this.applyEffRate(next);
  }

  /** Rate-change mechanics shared with setRate: re-anchor at the current target so the position never jumps. */
  private applyEffRate(rate: number): void {
    if (this.anchor && this.fetcher.store) {
      const t = this.targetTicks(this.clock.now());
      this.effRate = rate;
      this.anchor = { wallMs: this.clock.now(), archiveTicks: t };
    } else {
      this.effRate = rate;
    }
    this.emit('governed', { requestedRate: this._rate, effectiveRate: -rate });
    // An armed timer keyed to the old rate would wake off-pace — rekey it.
    if (this._state === 'playing') this.scheduleNext();
  }

  // ── Supply / buffering ─────────────────────────────────────────────────

  private maybeExtendBack(): void {
    const store = this.fetcher.store;
    if (!store || this.cursorTicks === null) return;
    const coverage = store.coverage();
    if (!coverage.length) return;
    if (this.fetcher.state === 'collecting' || this.fetcher.state === 'opening') return;
    if (this.archiveStartConcluded) return;
    if (this.zeroGrowthAims >= ZERO_GROWTH_AIM_LIMIT) return;
    const interval = this.cursorInterval(coverage);
    if (!interval) return;
    const headroomMs = store.ticksToEpochMs(this.cursorTicks)
      - store.ticksToEpochMs(interval.startTicks);
    if (headroomMs >= headroomTargetMs(this._rate)) return;
    this.extendFloorTicks = coverage[0].startTicks;
    void this.fetcher.extendBack().catch(() => {
      // Out of runway without a session becomes honest buffering on the next tick.
    });
  }

  private maybePrefetch(): void {
    const store = this.fetcher.store;
    const decoder = this.decoder;
    if (!store || !decoder || this.cursorTicks === null) return;
    if (this.decodeAheadFloorTicks === null || this.decodeAheadFloorTicks > this.cursorTicks) {
      this.decodeAheadFloorTicks = this.cursorTicks;
    }
    const targetMs = decodeAheadMs(this.effRate);
    const guardBytes = decoder.byteCap * PREFETCH_BYTE_GUARD_FRACTION;
    for (let guard = 0; guard < MAX_PREFETCH_GOPS; guard++) {
      const aheadMs = store.ticksToEpochMs(this.cursorTicks)
        - store.ticksToEpochMs(this.decodeAheadFloorTicks);
      if (aheadMs >= targetMs) break;
      const prevTail = store.prevSample(this.decodeAheadFloorTicks);
      if (!prevTail || !store.contiguous(prevTail.ticks, this.decodeAheadFloorTicks)) break;
      const run = store.gopFor(prevTail.ticks);
      if (!run) break;
      if (decoder.cacheByteLength + this.estGopBytes(run) > guardBytes) break; // byte gate → JIT
      const keyTicks = run.samples[0].ticks;
      if (keyTicks >= this.decodeAheadFloorTicks) break; // no downward progress
      this.decodeAheadFloorTicks = keyTicks;
      decoder.frameAt(run).catch(() => {
        // Opportunistic — a real failure surfaces on the actual paint.
      });
    }
  }

  private estGopBytes(run: DecodeRun): number {
    const vt = this.fetcher.init?.videoTrack;
    const w = vt?.width ?? 1920;
    const h = vt?.height ?? 1080;
    return w * h * 1.5 * run.samples.length;
  }

  private enterBuffering(): void {
    this.clearTimer();
    this.governorEngaged = true;
    if (this._state === 'buffering') return;
    this.setState('buffering');
    this.aimForRebuffer();
  }

  /** Fire one refill aim if the fetcher is resting; no-op while an aim is already in flight. */
  private aimForRebuffer(): void {
    const store = this.fetcher.store;
    if (!store) return;
    if (this.archiveStartConcluded) {
      this.finishAtArchiveStart();
      return;
    }
    if (this.fetcher.state === 'collecting' || this.fetcher.state === 'opening') return;
    this.extendFloorTicks = store.coverage()[0]?.startTicks ?? null;
    void this.fetcher.extendBack().catch(() => {});
  }

  private maybeResumeFromBuffering(): void {
    if (this._state !== 'buffering') return;
    const store = this.fetcher.store;
    if (!store || this.cursorTicks === null) return;
    const below = store.prevSample(this.cursorTicks);
    if (!below) {
      if (this.archiveStartConcluded) this.finishAtArchiveStart();
      return;
    }
    if (store.contiguous(below.ticks, this.cursorTicks)) {
      const interval = this.cursorInterval(store.coverage());
      const headroomMs = interval
        ? store.ticksToEpochMs(this.cursorTicks) - store.ticksToEpochMs(interval.startTicks)
        : 0;
      // Shallow: resume as soon as a modest band is playable — visible motion
      // beats hoarding the full headroom target while frozen. The governor
      // re-seeds from this runway (≈ the floor rate) and ramps up as supply
      // rebuilds toward headroomTargetMs.
      if (headroomMs >= RESUME_RUNWAY_MS || this.archiveStartConcluded) {
        this.resumePlaying();
      }
      return;
    }
    // Below is across a hole — resume so onTick's hole handling jumps once the aim rests.
    if (this.fetcher.state === 'paused' || this.fetcher.state === 'idle') {
      this.resumePlaying();
    }
  }

  private resumePlaying(): void {
    // Re-anchor at the held cursor: playback continues at pace, no catch-up rush.
    this.reanchorAt(this.cursorTicks!);
    this.setState('playing');
    // Re-seed the governor from the post-resume runway (stale pre-buffering
    // smoothing would replay the rate that just drained the buffer).
    this.effRateEma = null;
    this.govUpdatedAtMs = null;
    this.updateGovernor();
    // applyEffRate may have armed a wake — onTick assumes it IS the wake.
    this.clearTimer();
    this.onTick();
  }

  private onRunwayExhausted(): void {
    if (this.archiveStartConcluded) {
      this.finishAtArchiveStart();
      return;
    }
    this.enterBuffering();
  }

  private onHoleBelow(islandTop: StoreSample): void {
    if (this.fetcher.state === 'collecting' || this.fetcher.state === 'opening') {
      // An aim may stitch the gap — hold. windowcomplete/progress resolves it.
      this.enterBuffering();
      return;
    }
    const store = this.fetcher.store!;
    const gapFree = this.cursorTicks !== null
      ? this.fetcher.spanIsGapFree(
        store.ticksToEpochMs(islandTop.ticks),
        store.ticksToEpochMs(this.cursorTicks),
      )
      : null;
    if (gapFree === true) {
      // The chunk oracle says the archive is CONTINUOUS here — the hole is a
      // delivery artifact, not a recording gap. Hold pace: instant jumps over
      // artifact holes chain at decode speed into runaway descent. Delivery may
      // fill the hole before the paced due time.
      this.scheduleDescentTo(islandTop);
      return;
    }
    // Real recording gap (or unknown) + idle/paused fetcher → jump (the wall
    // clock never crawls unrecorded terrain).
    this.reanchorAt(islandTop.ticks);
    this.present(islandTop, true);
  }

  /**
   * Paint `s` at its paced due time — the position skips (a hole/seam is never
   * crawled) but the wall clock keeps the rate honest. If delivery heals the
   * runway before the due time, the normal tick path takes over instead —
   * unless `healable` is false (a decode-poisoned GOP looks structurally
   * healed but re-presenting it just faults again).
   */
  private scheduleDescentTo(s: StoreSample, healable = true): void {
    this.clearTimer();
    if (this._state !== 'playing' || !this.anchor) {
      this.reanchorAt(s.ticks);
      this.present(s, true);
      return;
    }
    const delay = Math.max(0, this.dueWallFor(s.ticks) - this.clock.now()) + TICK_SLOP_MS;
    this.timer = this.clock.setTimeout(() => {
      this.timer = null;
      if (this._state !== 'playing') return;
      const store = this.fetcher.store;
      if (!store || this.cursorTicks === null) {
        this.enterBuffering();
        return;
      }
      const next = store.prevSample(this.cursorTicks);
      if (healable && next && store.contiguous(next.ticks, this.cursorTicks) && store.gopFor(next.ticks)) {
        this.onTick(); // healed — normal paced descent resumes
        return;
      }
      this.reanchorAt(s.ticks);
      this.present(s, true);
    }, delay);
  }

  private concludeArchiveStart(): void {
    this.archiveStartConcluded = true;
    // 'starting' cold-entry at/older-than the archive edge would otherwise wedge
    // here (no timer, no progress to resolve on): autostop into stepping too.
    if (this._state === 'buffering' || this._state === 'starting') {
      this.resolveColdCursor();
      // Drain any runway between the cursor and the floor (buffering only), else finish.
      this.maybeResumeFromBuffering();
      if (this._state === 'buffering' || this._state === 'starting') this.finishAtArchiveStart();
    }
  }

  private finishAtArchiveStart(): void {
    this.autostop('archive-start');
  }

  /** Cold entry never painted, so give the autostop a cursor (the anchor) to land stepping on. */
  private resolveColdCursor(): void {
    if (this.cursorTicks !== null) return;
    const store = this.fetcher.store;
    if (store && this.pendingAnchorMs !== null) {
      this.cursorTicks = store.epochMsToTicks(this.pendingAnchorMs);
    }
  }

  private cursorInterval(coverage: CoverageInterval[]): CoverageInterval | null {
    const cursor = this.cursorTicks!;
    const eps = this.epsilonTicks();
    let fallback: CoverageInterval | null = null;
    for (const iv of coverage) {
      if (iv.startTicks - eps <= cursor && cursor <= iv.endTicks + eps) return iv;
      if (iv.startTicks <= cursor) fallback = iv;
    }
    return fallback;
  }

  // ── Fetcher event handlers ─────────────────────────────────────────────

  private onProgress(): void {
    this.resetSupplyLadders();
    if (this._state === 'starting' && this.pendingAnchorMs !== null) {
      this.extendProgressWatchdog();
      this.resolveColdStart();
      return;
    }
    if (this._state === 'buffering') {
      this.extendProgressWatchdog();
      this.maybeResumeFromBuffering();
    } else if (this._state === 'playing') {
      this.updateGovernor();
    }
  }

  private resolveColdStart(): void {
    const store = this.fetcher.store;
    if (!store || this.pendingAnchorMs === null) return;
    const floor = store.floorSample(store.epochMsToTicks(this.pendingAnchorMs));
    if (!floor) return; // keep waiting for the governing GOP
    this.pendingAnchorMs = null;
    this.cursorTicks = floor.ticks;
    this.reanchorAt(floor.ticks);
    this.maybeExtendBack();
    this.present(floor, true);
  }

  private onWindowComplete(): void {
    this.sessionLosses = 0;
    this.noteExtendOutcome();
    if (this._state === 'buffering') {
      this.maybeResumeFromBuffering();
      // Still short of the resume target and not concluded — fire the next refill.
      if (this._state === 'buffering') this.aimForRebuffer();
    } else if (this._state === 'playing') {
      this.maybeExtendBack();
    }
  }

  /** A completed extend with no backward growth counts toward the archive-start conclusion. */
  private noteExtendOutcome(): void {
    if (this.extendFloorTicks === null) return;
    const aimed = this.extendFloorTicks;
    this.extendFloorTicks = null;
    const store = this.fetcher.store;
    const oldest = store?.coverage()[0]?.startTicks;
    if (store && oldest !== undefined && oldest < aimed - store.epochMsToTicks(EPSILON_MS)) {
      this.zeroGrowthAims = 0;
      return;
    }
    this.zeroGrowthAims++;
    if (this.zeroGrowthAims >= ZERO_GROWTH_AIM_LIMIT) {
      if (this.earlierRecordedDataExists()) {
        if (this.gapHopRetries < GAP_HOP_RETRY_LIMIT) {
          this.gapHopRetries++;
          this.zeroGrowthAims = 0;
          // onWindowComplete's own follow-up (aimForRebuffer / maybeExtendBack)
          // fires the retry — the fresh budget unblocks its zero-growth gate.
          return;
        }
        // Data provably exists below — the server just won't serve it.
        this.autostop('supply-stalled');
        return;
      }
      this.concludeArchiveStart();
    }
  }

  /** Spans prove recorded data exists below the oldest coverage (false/null = no proof). */
  private earlierRecordedDataExists(): boolean {
    const store = this.fetcher.store;
    const oldest = store?.coverage()[0]?.startTicks;
    if (!store || oldest === undefined) return false;
    return this.fetcher.hasRecordedDataBefore(store.ticksToEpochMs(oldest)) === true;
  }

  private onStalled(): void {
    // Playing with runway: benign — the server may recover. A starved refill
    // (buffering) or a silently non-delivering cold start ('starting') counts
    // toward the bound → autostop into stepping; never wedge.
    if (this._state !== 'buffering' && this._state !== 'starting') return;
    this.resolveColdCursor();
    this.rebufferAims++;
    if (this.rebufferAims >= REBUFFER_AIM_LIMIT) {
      this.autostop('supply-stalled');
      return;
    }
    if (this._state === 'buffering') {
      this.fetcher.pauseDelivery();
      this.aimForRebuffer();
    }
    // 'starting': the cold openAtAnchor is its own aim — just count toward the bound.
  }

  private onLandingFailed(): void {
    this.landingFailures++;
    // A cold aim ('starting') that can't land has no follow-up event to retry on —
    // conclude at once rather than wedge; otherwise bound as usual.
    if (this.landingFailures >= LANDING_FAILURE_LIMIT || this._state === 'starting') {
      this.landingFailures = 0;
      this.concludeArchiveStart();
    } else if (this._state === 'buffering') {
      this.fetcher.pauseDelivery();
      this.aimForRebuffer();
    }
  }

  private onNoEarlierData(): void {
    if (this.earlierRecordedDataExists()) {
      if (this.gapHopRetries < GAP_HOP_RETRY_LIMIT) {
        this.gapHopRetries++;
        // Buffering: fire the retry now (the fetcher paused itself at the
        // misland). Playing: the next tick's maybeExtendBack re-aims.
        if (this._state === 'buffering') this.aimForRebuffer();
        return;
      }
      // Data provably exists below — the server just won't serve it.
      this.autostop('supply-stalled');
      return;
    }
    this.concludeArchiveStart();
  }

  private onConflictFailed(): void {
    // The fetcher already re-anchored once; accept coverage and re-aim, BOUNDED.
    // Conflicting delivery re-arms the stall watchdog, so 'stalled' never fires
    // here — without this bound the re-aim would loop forever (buffering wedge).
    if (this._state !== 'buffering') return;
    this.rebufferAims++;
    if (this.rebufferAims >= REBUFFER_AIM_LIMIT) {
      this.autostop('supply-stalled');
      return;
    }
    this.fetcher.pauseDelivery();
    this.aimForRebuffer();
  }

  private onSessionLost(): void {
    if (this._state === 'idle' || this._state === 'disabled') return;
    this.sessionLosses++;
    if (this.sessionLosses >= SESSION_LOSS_LIMIT) {
      this.disable('fetch session lost');
      return;
    }
    this.clearTimer();
    if (this._state === 'starting' && this.pendingAnchorMs !== null) {
      // Cold start still pending: retry the same aim and stay 'starting' so
      // onProgress can still resolve the entry.
      void this.fetcher.openAtAnchor(this.pendingAnchorMs).catch(() => this.disable('fetch session lost'));
      return;
    }
    const store = this.fetcher.store;
    const anchorMs = store && this.cursorTicks !== null
      ? store.ticksToEpochMs(this.cursorTicks)
      : this.pendingAnchorMs;
    if (anchorMs === null) {
      // Neither a painted cursor nor a pending anchor — nothing to rebuild at.
      this.autostop('supply-stalled');
      return;
    }
    // One bounded rebuild: buffer during the reopen; delivery self-heals the ladder.
    this.setState('buffering');
    void this.fetcher.openAtAnchor(anchorMs).catch(() => this.disable('fetch session lost'));
  }

  // ── Decoder lifecycle ──────────────────────────────────────────────────

  private ensureDecoder(): GopDecoder | null {
    if (this.decoder && !this.decoder.failed && !this.decoder.disposed) {
      return this.decoder;
    }
    const timescale = this.fetcher.init?.videoTrack?.timescale;
    if (!timescale) {
      this.disable('no decoder configuration available');
      return null;
    }
    // Dispose a failed/leftover decoder before replacing it — a swallowed
    // prefetch fault marks it failed without closing its VideoDecoder or cache.
    this.decoder?.dispose();
    this.decoder = this.config.createDecoder
      ? this.config.createDecoder(timescale)
      : new GopDecoder({ timescale, logger: this.config.logger });
    return this.decoder;
  }

  private onDecodeFailure(err: unknown, s: StoreSample): void {
    this.decoderFailures++;
    this.config.logger?.warn?.(`[ReversePlayer] decode failure #${this.decoderFailures}`, err);
    this.decoder?.dispose();
    this.decoder = null;
    if (this.decoderFailures < DECODER_FAILURE_LIMIT) {
      // One transparent retry on a fresh decoder — transient faults heal here.
      this.present(s, this._state !== 'playing');
      return;
    }
    // The fresh decoder rejected the same GOP: the DATA is poisoned (bad
    // parameter set, camera glitch), not the decoder. Skip below it like an
    // undecodable seam — disabling reverse for one bad GOP punishes the whole
    // run. Bounded: a run of poisoned GOPs without a single paint concludes
    // the stream is genuinely undecodable.
    this.decoderFailures = 0;
    this.poisonedGopRun++;
    if (this.poisonedGopRun >= POISONED_GOP_RUN_LIMIT) {
      this.disable('consecutive undecodable GOPs');
      return;
    }
    const store = this.fetcher.store;
    const keyTicks = store?.gopFor(s.ticks)?.samples[0]?.ticks ?? s.ticks;
    const below = store?.prevSample(keyTicks) ?? null;
    if (!store || !below) {
      this.disable('decoder failed twice');
      return;
    }
    this.config.logger?.warn?.(
      `[ReversePlayer] skipping undecodable GOP at ${store.ticksToEpochMs(keyTicks)}`,
    );
    if (this._state === 'playing' && this.anchor) {
      this.scheduleDescentTo(below, false);
    } else {
      this.reanchorAt(below.ticks);
      this.present(below, true);
    }
  }

  // ── Teardown ───────────────────────────────────────────────────────────

  private teardown(): void {
    this.clearTimer();
    this.clearBufferingWatchdog();
    this.playToken++;
    this.decoder?.dispose();
    this.decoder = null;
    this.decoderFailures = 0;
    if (this.savedWindowMs !== null) {
      this.fetcher.setWindowMs(this.savedWindowMs);
      this.savedWindowMs = null;
      this.fetcher.setFetchSpeed(this.savedFetchSpeed);
      this.savedFetchSpeed = undefined;
    }
    this.fetcher.pauseDelivery();
  }

  private autostop(reason: 'archive-start' | 'supply-stalled'): void {
    const cursorEpochMs = this.cursorEpochMs;
    this.teardown();
    this.setState('idle');
    this.emit('autostopped', { reason, cursorEpochMs });
  }

  private disable(reason: string): void {
    if (this._state === 'disabled') return;
    this.config.logger?.error?.(`[ReversePlayer] disabled: ${reason}`);
    this.teardown();
    this.setState('disabled');
    this.emit('disabled', reason);
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private resetSupplyLadders(): void {
    this.rebufferAims = 0;
    this.zeroGrowthAims = 0;
    this.landingFailures = 0;
    this.sessionLosses = 0;
    this.gapHopRetries = 0;
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      this.clock.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private epsilonTicks(): number {
    const store = this.fetcher.store;
    return store ? store.epochMsToTicks(EPSILON_MS) : 0;
  }

  private setState(state: ReversePlayerState): void {
    if (this._state === state) return;
    this._state = state;
    // Wedge bound: starvation must always terminate in bounded time. The
    // rebuffer ladder only advances on fetcher EVENTS (stalled/windowcomplete/
    // landingfailed) — a churning no-progress loop (rapid buffering↔resume
    // flaps that never paint) or a cold entry whose aims keep getting vetoed
    // (delivery flows, so the fetcher never 'stalls') fires none of them and
    // would hold the marker forever. So the watchdog is PAINT-scoped: armed on
    // entering 'starting'/'buffering', released only by a painted frame (real
    // progress) or a fresh aim — a buffering→playing transition alone must NOT
    // reset it, or flapping dodges the bound indefinitely.
    if (state === 'buffering' || state === 'starting') {
      this.armProgressWatchdog(state === 'starting' ? COLD_START_TIMEOUT_MS : BUFFERING_WEDGE_TIMEOUT_MS);
    }
    this.emit('state', state);
  }

  /** No-op while already armed — the bound covers the whole no-paint spell. */
  private armProgressWatchdog(boundMs: number): void {
    if (this.bufferingWatchdog !== null) return;
    this.watchdogSpellStartMs = this.clock.now();
    this.watchdogBoundMs = boundMs;
    this.armWatchdogTimer(boundMs);
  }

  /**
   * Delivery arrived during the spell: a slow-but-alive refill deserves more
   * than the per-spell bound, so re-key the timer — capped so the WHOLE spell
   * (however much trickle) still terminates within
   * {@link BUFFERING_TOTAL_BOUND_MS}. Painted frames remain the only release.
   */
  private extendProgressWatchdog(): void {
    if (this.bufferingWatchdog === null || this.watchdogSpellStartMs === null) return;
    const elapsed = this.clock.now() - this.watchdogSpellStartMs;
    const extended = Math.min(this.watchdogBoundMs, BUFFERING_TOTAL_BOUND_MS - elapsed);
    if (extended <= 0) return; // total bound spent — let the armed timer conclude
    this.clock.clearTimeout(this.bufferingWatchdog);
    this.armWatchdogTimer(extended);
  }

  private armWatchdogTimer(ms: number): void {
    this.bufferingWatchdog = this.clock.setTimeout(() => {
      this.bufferingWatchdog = null;
      if (this._state === 'buffering' || this._state === 'playing' || this._state === 'starting') {
        this.autostop('supply-stalled');
      }
    }, ms);
  }

  private clearBufferingWatchdog(): void {
    if (this.bufferingWatchdog !== null) {
      this.clock.clearTimeout(this.bufferingWatchdog);
      this.bufferingWatchdog = null;
    }
    this.watchdogSpellStartMs = null;
  }

  private emit<K extends ReversePlayerEvent>(event: K, detail: ReversePlayerEventMap[K]): void {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail }));
  }
}
