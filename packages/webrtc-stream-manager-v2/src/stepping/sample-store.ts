// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import type { Fmp4VideoFragment } from './fmp4-parser';

// ─── Time model ─────────────────────────────────────────────────────────────
//
// Container pts is meaningless as a global axis: the fetch session's timeline
// is strictly monotonic and never re-bases — even across backward seeks the
// muxer flattens delivery to forward — so two windows occupy disjoint ordered
// container-tick ranges while their ARCHIVE ranges can be in any order.
//
// Each fragment is placed on the archive axis via its window's anchor pair
// (handed by the server at session start and after every seek; rtpTimestamp
// ticks at the mp4 track timescale):
//
//     epochTicks(sample) = timestampMs · (timescale/1000) − rtpTimestamp + pts
//
// Within a window the mapping is exact; across windows the anchor's integer-ms
// quantization wobbles placement by ±0.5 ms (EPSILON_TICKS), absorbed by
// overlap dedup and interval merging. Live anchors wobble ½–1 frame
// SYSTEMATICALLY on degraded servers: off-grid re-delivery is sequence-aligned
// by its size fingerprint and snapped onto the stored grid; what can't align
// is rejected or enters as a counted near-duplicate. Fragments may still
// overlap, so lookups never assume disjoint coverage.

/** A DC timestamp event pair anchoring container ticks to archive epoch ms. */
export interface AnchorPair {
  timestampMs: number;
  rtpTimestamp: number;
}

export interface StoreSample {
  /** Archive position in track ticks (anchored pts). */
  ticks: number;
  durationTicks: number;
  key: boolean;
  /** Encoded AVCC sample bytes (view into the delivery buffer). */
  bytes: Uint8Array;
  /** Config-registry index of the decoder config in effect at delivery; a mid-session codec change starts a new epoch. */
  configEpoch: number;
}

/** A decoder configuration (codec string + avcC/hvcC record) for one epoch. */
export interface SampleConfig {
  /** WebCodecs codec string, e.g. `avc1.640028`. */
  codec: string;
  /** Decoder configuration record bytes (avcC/hvcC) from the init segment. */
  description: Uint8Array;
}

export interface CoverageInterval {
  startTicks: number;
  /** Exclusive end (last sample's ticks + duration). */
  endTicks: number;
}

export type InsertResult =
  | {
      accepted: true;
      addedSamples: number;
      /** Covered-terrain samples judged away by a coverage-boundary split (straddling fragment); absent when it placed cleanly. */
      droppedConflicts?: number;
    }
  | { accepted: false; reason: 'fingerprint-conflict' | 'interleave-conflict' | 'empty' };

interface StoredFragment {
  startTicks: number;
  endTicks: number;
  byteLength: number;
  samples: StoreSample[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Default encoded-domain byte cap: ≈2 min @ 4 Mbps, ≈32 s @ 16 Mbps. */
const DEFAULT_BYTE_CAP = 64 * 1024 * 1024;

/** Cross-window placement tolerance: anchor timestampMs is integer-quantized, so mappings disagree by ±0.5 ms. Anything closer is "the same instant". */
const EPSILON_MS = 1;

/** Snap-stitch candidate-scan reject: fragments farther than this from the incoming span can never pair within the wobble bound (beyond 1 s = sub-1-fps, out of scope). */
const SNAP_SCAN_MARGIN_MS = 1_000;

/** Durations at or below this are container artifacts (server stamps fragment-final samples ~1 ms), not frame intervals. Filters what feeds `minDurationTicks`. */
const MIN_REAL_FRAME_INTERVAL_MS = 4;

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.byteLength === b.byteLength && a.every((v, i) => v === b[i]);
}

// ─── SampleStore ────────────────────────────────────────────────────────────

/**
 * Archive-time-ordered store of encoded video samples for one camera.
 *
 * - Coverage is an interval set with explicit holes between fragments that
 *   fail to merge (fragments are internally gapless by dts-chain construction).
 * - Overlapping re-delivery is deduped by the stitch fingerprint — the
 *   sample-SIZE sequence (mdat bytes are byte-identical across re-delivery;
 *   durations jitter ±1 tick and are never compared). Wobble beyond the
 *   tolerance can still overlap, so lookups tolerate overlapping fragments.
 * - Byte-capped, far-side eviction, whole fragments only: sample views pin
 *   their delivery buffer, so partial eviction frees nothing.
 */
export class SampleStore {
  private readonly tickRate: number; // ticks per ms
  private readonly epsilonTicks: number;
  private readonly byteCap: number;
  /** Sorted by startTicks; overlap is rare (anchor wobble) but tolerated. */
  private fragments: StoredFragment[] = [];
  private totalBytes = 0;
  /** Smallest stored sample duration — a live lower bound on the frame interval. */
  private minDurationTicks = Infinity;
  private _phantomDuplicates = 0;
  private _snapStitches = 0;
  private _seamSplits = 0;
  /** Decoder configs by epoch; samples reference one by index. */
  private configs: SampleConfig[] = [];

  constructor(opts: { timescale: number; byteCapBytes?: number }) {
    this.tickRate = opts.timescale / 1000;
    this.epsilonTicks = EPSILON_MS * this.tickRate;
    this.byteCap = opts.byteCapBytes ?? DEFAULT_BYTE_CAP;
  }

  // ── Conversions ───────────────────────────────────────────────────────

  epochMsToTicks(ms: number): number {
    return ms * this.tickRate;
  }

  ticksToEpochMs(ticks: number): number {
    return ticks / this.tickRate;
  }

  // ── Config registry ───────────────────────────────────────────────────

  /**
   * Register a decoder config and return its epoch index. Identical configs
   * collapse, so a codec that switches back (A → B → A) reuses A's epoch and
   * never triggers a needless reconfigure.
   */
  registerConfig(config: SampleConfig): number {
    const existing = this.configs.findIndex(
      (c) => c.codec === config.codec && bytesEqual(c.description, config.description),
    );
    if (existing >= 0) {
      return existing;
    }
    this.configs.push(config);
    return this.configs.length - 1;
  }

  /** The decoder configuration for an epoch, or null if out of range. */
  configAt(epoch: number): SampleConfig | null {
    return this.configs[epoch] ?? null;
  }

  // ── Insertion ─────────────────────────────────────────────────────────

  /**
   * Insert a parsed fragment, placed on the archive axis by its window's
   * anchor pair. `configEpoch` is captured at parse time so a delayed anchor
   * cannot mis-tag samples across a codec boundary.
   *
   * Samples on already-covered ticks are verified against the existing size
   * fingerprint and skipped. A fragment off-grid against coverage (anchor
   * wobble) is sequence-aligned first: if its size sequence identifies it as
   * the same footage it snaps onto the stored grid and dedups normally. Only
   * a genuine mismatch rejects — a size conflict on aligned ticks as
   * `fingerprint-conflict`, an unalignable sample strictly INSIDE coverage as
   * `interleave-conflict` (interleaving would fabricate a phantom double-rate
   * timeline from two recordings). A conflicting fragment that ENTERS a
   * coverage edge is not rejected whole: its clean prefix inserts and only the
   * conflict onward is judged away (whole-fragment rejection bit the GOP tail
   * out of every backfill seam). A fragment conflicting from its first sample
   * still rejects whole.
   */
  insertFragment(frag: Fmp4VideoFragment, anchor: AnchorPair, configEpoch: number): InsertResult {
    if (frag.samples.length === 0) {
      return { accepted: false, reason: 'empty' };
    }

    const offset = anchor.timestampMs * this.tickRate - anchor.rtpTimestamp;
    const incoming: StoreSample[] = frag.samples.map((s) => ({
      ticks: offset + s.pts,
      durationTicks: s.duration,
      key: s.key,
      bytes: s.bytes,
      configEpoch,
    }));

    let placed = this.placeSamples(incoming);
    let mapped = incoming;
    let droppedConflicts = 0;
    if (placed.ok === false || placed.phantoms > 0) {
      // Off-grid: same footage wobbled, or foreign footage mis-anchored —
      // the size sequence tells them apart.
      const snapped = this.snapToStoredGrid(incoming);
      if (snapped) {
        const replaced = this.placeSamples(snapped);
        if (replaced.ok) {
          placed = replaced;
          mapped = snapped;
          this._snapStitches += 1;
        }
      }
    }
    if (placed.ok === false) {
      const split = this.placeSplitAtCoverage(incoming);
      if (!split) {
        return { accepted: false, reason: placed.reason };
      }
      placed = { ok: true, runs: split.runs, phantoms: split.phantoms };
      droppedConflicts = split.dropped;
      this._seamSplits += 1;
    }

    const { runs, phantoms } = placed;
    this._phantomDuplicates += phantoms;
    if (runs.length === 0) {
      return { accepted: true, addedSamples: 0 };
    }

    // The fragment-final sample never feeds the frame-interval bound: its
    // duration is a muxer stamp with no next pts to validate, observed
    // degenerate up to ~5 ms (above the artifact filter), collapsing the bound.
    const fragmentFinal = mapped[mapped.length - 1];

    let added = 0;
    for (const samples of runs) {
      const last = samples[samples.length - 1];
      const fragment: StoredFragment = {
        startTicks: samples[0].ticks,
        endTicks: last.ticks + last.durationTicks,
        byteLength: samples.reduce((n, s) => n + s.bytes.byteLength, 0),
        samples,
      };

      const at = this.fragments.findIndex((f) => f.startTicks > fragment.startTicks);
      this.fragments.splice(at === -1 ? this.fragments.length : at, 0, fragment);
      this.totalBytes += fragment.byteLength;
      added += samples.length;

      for (const s of samples) {
        // Live lower bound on the REAL frame interval: degenerate durations
        // would collapse the phantom band, the gopFor interleave refusal, and
        // the snap-bound floor to nothing.
        if (
          s !== fragmentFinal
          && s.durationTicks > MIN_REAL_FRAME_INTERVAL_MS * this.tickRate
          && s.durationTicks < this.minDurationTicks
        ) {
          this.minDurationTicks = s.durationTicks;
        }
      }
    }

    return droppedConflicts > 0
      ? { accepted: true, addedSamples: added, droppedConflicts }
      : { accepted: true, addedSamples: added };
  }

  /**
   * Dry-run placement against existing coverage: dedup exact re-delivery,
   * split survivors into runs at skip boundaries, count edge-band phantoms —
   * or report the conflict that stops the fragment. Commits nothing.
   */
  private placeSamples(samples: StoreSample[]):
    | { ok: true; runs: StoreSample[][]; phantoms: number }
    | { ok: false; reason: 'fingerprint-conflict' | 'interleave-conflict' } {
    const coverage = this.coverage();
    const runs: StoreSample[][] = [];
    let run: StoreSample[] = [];
    let phantoms = 0;
    for (const sample of samples) {
      const existing = this.sampleNear(sample.ticks);
      if (existing) {
        if (existing.bytes.byteLength === sample.bytes.byteLength) {
          if (run.length > 0) {
            runs.push(run);
            run = [];
          }
          continue; // identical re-delivery — keep the copy we have
        }
        if (this.isInteriorOf(coverage, sample.ticks)) {
          return { ok: false, reason: 'fingerprint-conflict' };
        }
        // Epsilon-near a coverage EDGE with a different size: two ADJACENT
        // frames from different aims whose grids wobble-squeeze the seam to
        // sub-epsilon. A true twin would be interior; at the edge the newcomer
        // is new terrain — insert it.
        phantoms += 1;
      } else if (this.isInteriorOf(coverage, sample.ticks)) {
        return { ok: false, reason: 'interleave-conflict' };
      } else if (this.isPhantomNear(sample.ticks)) {
        phantoms += 1;
      }
      run.push(sample);
    }
    if (run.length > 0) {
      runs.push(run);
    }
    return { ok: true, runs, phantoms };
  }

  /**
   * Coverage-boundary split: a conflicting fragment that ENTERS coverage
   * carries NEW terrain in front of it (whole-fragment rejection bit ~420 ms
   * out of every backfill seam). Only the clean PREFIX is trustworthy: samples
   * before the first interior conflict dedup or insert normally; the conflict
   * onward shares whatever mis-anchoring put a sample inside covered terrain
   * and is dropped. Returns null when no prefix survives — a fragment that
   * conflicts from the start still rejects whole (never-corrupt).
   */
  private placeSplitAtCoverage(samples: StoreSample[]):
    | { runs: StoreSample[][]; phantoms: number; dropped: number }
    | null {
    const coverage = this.coverage();
    const runs: StoreSample[][] = [];
    let run: StoreSample[] = [];
    let phantoms = 0;
    const endRun = () => {
      if (run.length > 0) {
        runs.push(run);
        run = [];
      }
    };
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const existing = this.sampleNear(sample.ticks);
      if (existing && existing.bytes.byteLength === sample.bytes.byteLength) {
        endRun();
        continue; // identical re-delivery — keep the copy we have
      }
      if (this.isInteriorOf(coverage, sample.ticks)) {
        endRun();
        if (runs.length === 0) {
          return null;
        }
        return { runs, phantoms, dropped: samples.length - i };
      }
      if (existing || this.isPhantomNear(sample.ticks)) {
        phantoms += 1; // edge-band near-duplicate (seam squeeze)
      }
      run.push(sample);
    }
    endRun();
    // Reached only when nothing conflicted (the caller saw a failure, so the
    // loop normally returns above).
    return runs.length > 0 ? { runs, phantoms, dropped: 0 } : null;
  }

  /**
   * Sequence-aligned stitching: an off-grid overlap re-delivery carries the
   * SAME footage (mdat bytes are byte-identical), so its sample-SIZE sequence
   * identifies it. Pair each incoming sample with size-equal stored samples
   * within the wobble bound; each pairing implies a constant shift, tried
   * smallest first. A shift verifies only if EVERY shifted sample on covered
   * terrain sits within epsilon of a size-equal stored sample — the stored
   * grid stays authoritative. Returns the re-based samples, or null when no
   * alignment exists (different footage — the caller rejects).
   */
  private snapToStoredGrid(incoming: StoreSample[]): StoreSample[] | null {
    if (this.fragments.length === 0) {
      return null;
    }
    const first = incoming[0];
    const last = incoming[incoming.length - 1];
    const scanMargin = SNAP_SCAN_MARGIN_MS * this.tickRate;

    const shifts: number[] = [];
    for (const f of this.fragments) {
      if (f.endTicks < first.ticks - scanMargin || f.startTicks > last.ticks + scanMargin) {
        continue;
      }
      for (const s of f.samples) {
        const bound = this.snapBoundTicks(s);
        for (const i of incoming) {
          const delta = s.ticks - i.ticks;
          if (Math.abs(delta) > bound) continue;
          // On-grid pairings imply no move — placeSamples already ruled on them.
          if (Math.abs(delta) <= this.epsilonTicks) continue;
          if (s.bytes.byteLength !== i.bytes.byteLength) continue;
          if (!shifts.some((d) => Math.abs(d - delta) <= this.epsilonTicks)) {
            shifts.push(delta);
          }
        }
      }
    }
    shifts.sort((a, b) => Math.abs(a) - Math.abs(b));

    const coverage = this.coverage();
    for (const delta of shifts) {
      let matched = 0;
      let consistent = true;
      for (const i of incoming) {
        const t = i.ticks + delta;
        const near = this.sampleNear(t);
        if (near) {
          if (near.bytes.byteLength !== i.bytes.byteLength) {
            consistent = false;
            break;
          }
          matched += 1;
        } else if (this.isInteriorOf(coverage, t)) {
          // In covered terrain yet matching nothing — this shift isn't it.
          consistent = false;
          break;
        }
      }
      if (consistent && matched > 0) {
        return incoming.map((s) => ({ ...s, ticks: s.ticks + delta }));
      }
    }
    return null;
  }

  /**
   * Per-pair snap bound: wobble is ½–1 frame of the LOCAL interval, so allow
   * 1.5× the stored sample's duration (floored at the store-wide minimum for
   * degenerate durations). Anything farther is a real re-position, not wobble.
   */
  private snapBoundTicks(stored: StoreSample): number {
    const frame = Math.max(
      stored.durationTicks,
      Number.isFinite(this.minDurationTicks) ? this.minDurationTicks : 0,
    );
    return frame * 1.5 + this.epsilonTicks;
  }

  /**
   * Strictly inside a merged coverage interval (epsilon margins keep
   * boundary-adjacent appends/prepends out): every instant there already has
   * its sample, so an unaligned newcomer is the same span under a wrong anchor.
   */
  private isInteriorOf(coverage: CoverageInterval[], t: number): boolean {
    return coverage.some(
      (iv) => t > iv.startTicks + this.epsilonTicks && t < iv.endTicks - this.epsilonTicks,
    );
  }

  /**
   * A fresh sample landing closer to coverage than any observed frame interval
   * (yet beyond the dedup tolerance) is probably the same physical frame
   * re-anchored under wobble. Provable wobble is snapped by
   * {@link snapToStoredGrid} first; what remains is counted as a near-duplicate.
   * The epsilon slack on the upper bound keeps exactly-adjacent windows out.
   */
  private isPhantomNear(t: number): boolean {
    const floor = this.floorSample(t);
    const next = this.nextSample(t);
    const dist = Math.min(
      floor ? Math.abs(t - floor.ticks) : Infinity,
      next ? next.ticks - t : Infinity,
    );
    return dist > this.epsilonTicks && dist < this.minDurationTicks - this.epsilonTicks;
  }

  // ── Lookup ────────────────────────────────────────────────────────────

  /** Greatest sample with ticks strictly below `t` (tolerance-adjusted). */
  prevSample(t: number): StoreSample | null {
    let best: StoreSample | null = null;
    for (const f of this.fragments) {
      if (f.startTicks >= t) break;
      for (const s of f.samples) {
        if (s.ticks < t - this.epsilonTicks) {
          if (!best || s.ticks > best.ticks) best = s;
        }
      }
    }
    return best;
  }

  /** Least sample with ticks strictly above `t` (tolerance-adjusted). */
  nextSample(t: number): StoreSample | null {
    let best: StoreSample | null = null;
    for (const f of this.fragments) {
      if (best && f.startTicks >= best.ticks) {
        break;
      }
      if (f.endTicks <= t) {
        continue;
      }
      for (const s of f.samples) {
        if (s.ticks > t + this.epsilonTicks) {
          if (!best || s.ticks < best.ticks) {
            best = s;
          }
          break; // fragment samples are tick-ordered — first hit is its minimum
        }
      }
    }
    return best;
  }

  /** Greatest sample with ticks ≤ `t` (within tolerance). */
  floorSample(t: number): StoreSample | null {
    let best: StoreSample | null = null;
    for (const f of this.fragments) {
      if (f.startTicks > t + this.epsilonTicks) break;
      for (const s of f.samples) {
        if (s.ticks <= t + this.epsilonTicks) {
          if (!best || s.ticks > best.ticks) best = s;
        }
      }
    }
    return best;
  }

  /** A sample within epsilon of `t`, if any (identity lookup). */
  sampleNear(t: number): StoreSample | null {
    const floor = this.floorSample(t);
    if (floor && Math.abs(floor.ticks - t) <= this.epsilonTicks) return floor;
    return null;
  }

  /**
   * The decode unit for the sample at `t`: the governing sync sample through
   * `t`, in decode order, plus the target's index and the run's decoder config.
   * Returns null when `t` is not in the store, no sync sample precedes it
   * contiguously, or the config epoch is unknown. The run never spans a codec
   * boundary — a new init begins with a keyframe, which restarts the run.
   */
  gopFor(
    t: number,
  ): { samples: StoreSample[]; targetIndex: number; config: SampleConfig } | null {
    const target = this.sampleNear(t);
    if (!target) return null;

    const interval = this.intervalContaining(target.ticks);
    if (!interval) return null;

    // Gather the interval's samples through the target in tick order:
    // fragments can overlap under wobble, so fragment-list order is not decode
    // order and near-coincident re-deliveries must collapse.
    const pool: StoreSample[] = [];
    for (const f of this.fragments) {
      if (f.endTicks <= interval.startTicks || f.startTicks >= interval.endTicks) {
        continue;
      }
      for (const s of f.samples) {
        if (s.ticks > target.ticks + this.epsilonTicks) {
          break;
        }
        pool.push(s);
      }
    }
    pool.sort((a, b) => a.ticks - b.ticks);

    // Collect the contiguous run from the governing keyframe to the target.
    const run: StoreSample[] = [];
    let prevTicks = Number.NEGATIVE_INFINITY;
    for (const s of pool) {
      const gap = s.ticks - prevTicks;
      if (gap <= this.epsilonTicks) {
        // Duplicate instant — except a KEYFRAME wobble-squeezed onto a previous
        // aim's trailing delta: skipping it would strand the next GOP's deltas
        // without their key. The key wins the instant.
        if (s.key) {
          run.length = 0;
          prevTicks = s.ticks;
          run.push(s);
        }
        continue;
      }
      // Adjacent samples closer than any real frame interval = interleaved
      // mis-anchored coverage — decoding would feed P-frames references from a
      // different recording. Refuse rather than ghost.
      if (
        Number.isFinite(this.minDurationTicks)
        && gap < this.minDurationTicks - this.epsilonTicks
      ) {
        return null;
      }
      prevTicks = s.ticks;
      if (s.key) {
        run.length = 0; // new GOP — restart the run
      }
      run.push(s);
    }
    if (run.length === 0 || !run[0].key) return null;
    const config = this.configAt(run[0].configEpoch);
    if (!config) return null;
    return { samples: run, targetIndex: run.length - 1, config };
  }

  // ── Coverage ──────────────────────────────────────────────────────────

  /** Merged coverage intervals (holes are the gaps between them). */
  coverage(): CoverageInterval[] {
    const merged: CoverageInterval[] = [];
    for (const f of this.fragments) {
      const last = merged[merged.length - 1];
      if (last && f.startTicks <= last.endTicks + this.epsilonTicks) {
        last.endTicks = Math.max(last.endTicks, f.endTicks);
      } else {
        merged.push({ startTicks: f.startTicks, endTicks: f.endTicks });
      }
    }
    return merged;
  }

  /** Whether `a` and `b` lie in the same merged coverage interval. */
  contiguous(a: number, b: number): boolean {
    const interval = this.intervalContaining(a);
    return interval !== null
      && b >= interval.startTicks - this.epsilonTicks
      && b <= interval.endTicks + this.epsilonTicks;
  }

  covers(t: number): boolean {
    return this.intervalContaining(t) !== null;
  }

  private intervalContaining(t: number): CoverageInterval | null {
    for (const iv of this.coverage()) {
      if (t >= iv.startTicks - this.epsilonTicks && t < iv.endTicks + this.epsilonTicks) {
        return iv;
      }
    }
    return null;
  }

  // ── Budget ────────────────────────────────────────────────────────────

  get byteLength(): number {
    return this.totalBytes;
  }

  get sampleCount(): number {
    return this.fragments.reduce((n, f) => n + f.samples.length, 0);
  }

  /** Fresh samples that landed within (epsilon, frame interval) of coverage (anchor wobble). */
  get phantomDuplicates(): number {
    return this._phantomDuplicates;
  }

  /** Off-grid re-deliveries identified by size sequence and re-based onto the stored grid. */
  get snapStitches(): number {
    return this._snapStitches;
  }

  /** Boundary-straddling fragments whose off-coverage runs inserted past a judged overlap. */
  get seamSplits(): number {
    return this._seamSplits;
  }

  /**
   * Evict whole fragments, farthest-from-cursor side first, to the byte cap.
   * Fragment granularity is deliberate: sample views pin their delivery
   * ArrayBuffer, so only dropping every view frees memory.
   */
  evictToCap(cursorTicks: number): void {
    while (this.totalBytes > this.byteCap && this.fragments.length > 1) {
      const first = this.fragments[0];
      const last = this.fragments[this.fragments.length - 1];
      const firstDist = Math.abs(cursorTicks - (first.startTicks + first.endTicks) / 2);
      const lastDist = Math.abs(cursorTicks - (last.startTicks + last.endTicks) / 2);
      const victim = firstDist >= lastDist ? this.fragments.shift()! : this.fragments.pop()!;
      this.totalBytes -= victim.byteLength;
    }
  }

  clear(): void {
    this.fragments = [];
    this.totalBytes = 0;
  }
}
