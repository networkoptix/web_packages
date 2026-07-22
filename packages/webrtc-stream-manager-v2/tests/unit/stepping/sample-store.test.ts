// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect } from 'vitest';

import { SampleStore, type AnchorPair } from '../../../src/stepping/sample-store';
import type { Fmp4VideoFragment } from '../../../src/stepping/fmp4-parser';
import { OVERLAP_TABLES, type OverlapWindow } from './fmp4-fixtures';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TIMESCALE = 15360;
const TICKS_PER_MS = TIMESCALE / 1000;

/** Epoch base for tests — an arbitrary archive position (ms). */
const T0 = 1_780_000_000_000;

interface SampleSpec {
  duration: number;
  size: number;
  key?: boolean;
}

/** Build a parser-shaped fragment from compact specs (dts chain from baseDts). */
function makeFragment(
  baseDts: number,
  specs: SampleSpec[],
  seq = 1,
): Fmp4VideoFragment {
  let dts = baseDts;
  const samples = specs.map((spec, i) => {
    const s = {
      dts,
      pts: dts,
      duration: spec.duration,
      key: spec.key ?? i === 0,
      bytes: new Uint8Array(spec.size).fill(i & 0xff),
    };
    dts += spec.duration;
    return s;
  });
  return { seq, trackId: 1, baseDts, samples };
}

/** Anchor that maps container tick `rtp` onto epoch `ms`. */
function anchor(ms: number, rtp: number): AnchorPair {
  return { timestampMs: ms, rtpTimestamp: rtp };
}

/** An avcC-shaped record: configurationVersion=1, profile/compat/level bytes. */
const AVCC = new Uint8Array([1, 0x64, 0x00, 0x28]);
const CODEC = 'avc1.640028';

function makeStore(byteCapBytes?: number): SampleStore {
  const store = new SampleStore({ timescale: TIMESCALE, byteCapBytes });
  store.registerConfig({ codec: CODEC, description: AVCC });
  return store;
}

/** Insert through the registered default epoch unless a specific one is given. */
function insert(
  store: SampleStore,
  frag: Fmp4VideoFragment,
  anchorPair: AnchorPair,
  epoch = 0,
) {
  return store.insertFragment(frag, anchorPair, epoch);
}

/** Uniform 512-tick GOP: 1 key + n−1 deltas, 1000 B each. */
function uniformGop(n: number): SampleSpec[] {
  return Array.from({ length: n }, () => ({ duration: 512, size: 1000 }));
}

/**
 * 512-tick GOP with a distinct size per index — real-footage-shaped for the
 * stitch fingerprint, where the size sequence identifies samples.
 */
function variedGop(n: number): SampleSpec[] {
  return Array.from({ length: n }, (_, i) => ({ duration: 512, size: 1000 + i * 16 }));
}

// ─── Placement & lookup ─────────────────────────────────────────────────────

describe('SampleStore — anchored placement and lookup', () => {
  it('places samples on the archive axis via the window anchor', () => {
    const store = makeStore();
    const frag = makeFragment(10_000, uniformGop(3));
    const result = insert(store, frag, anchor(T0, 10_000));

    expect(result).toEqual({ accepted: true, addedSamples: 3 });
    expect(store.sampleCount).toBe(3);

    const t0Ticks = T0 * TICKS_PER_MS;
    const first = store.floorSample(t0Ticks);
    expect(first).not.toBeNull();
    expect(first!.ticks).toBeCloseTo(t0Ticks, 5);
    expect(store.ticksToEpochMs(first!.ticks)).toBeCloseTo(T0, 5);
  });

  it('prev/next land on actual neighbouring samples (VFR-native)', () => {
    const store = makeStore();
    // VFR: 11 ms / 62 ms / 33 ms frames, like the spike camera.
    const specs: SampleSpec[] = [
      { duration: 169, size: 5000 },
      { duration: 952, size: 300 },
      { duration: 512, size: 400 },
    ];
    insert(store, makeFragment(0, specs), anchor(T0, 0));

    const base = T0 * TICKS_PER_MS;
    const middle = store.nextSample(base);
    expect(middle!.ticks).toBeCloseTo(base + 169, 5);

    // prev from the middle sample's own position skips itself.
    const prev = store.prevSample(middle!.ticks);
    expect(prev!.ticks).toBeCloseTo(base, 5);

    const next = store.nextSample(middle!.ticks);
    expect(next!.ticks).toBeCloseTo(base + 169 + 952, 5);

    expect(store.prevSample(base)).toBeNull();
    expect(store.nextSample(next!.ticks)).toBeNull();
  });
});

// ─── Cross-window coherence ─────────────────────────────────────────────────

describe('SampleStore — cross-window coherence', () => {
  it('merges windows that are archive-adjacent despite disjoint container ticks', () => {
    const store = makeStore();
    const gop = uniformGop(30); // 30 × 512 ticks = 1 s

    // Window 1: container ticks 0…, archive T0.
    insert(store, makeFragment(0, gop), anchor(T0, 0));
    // Window 2: fetched later via backward seek — container ticks continue
    // FORWARD (1 000 000) while archive position is 1 s BEFORE window 1.
    insert(store,
      makeFragment(1_000_000, gop, 2),
      anchor(T0 - 1000, 1_000_000),
    );

    expect(store.coverage()).toHaveLength(1);
    expect(store.sampleCount).toBe(60);

    // Stepping back across the window boundary is seamless.
    const w1First = store.sampleNear(T0 * TICKS_PER_MS)!;
    const prev = store.prevSample(w1First.ticks)!;
    expect(prev.ticks).toBeCloseTo(w1First.ticks - 512, 3);
    expect(store.contiguous(prev.ticks, w1First.ticks)).toBe(true);
  });

  it('keeps a real archive gap as two intervals with an explicit hole', () => {
    const store = makeStore();
    const gop = uniformGop(30);

    insert(store, makeFragment(0, gop), anchor(T0, 0));
    // Second window ends 200 ms short of the first — a real hole.
    insert(store, makeFragment(1_000_000, gop, 2), anchor(T0 - 1200, 1_000_000));

    const coverage = store.coverage();
    expect(coverage).toHaveLength(2);

    const w1Start = T0 * TICKS_PER_MS;
    const holeEnd = store.prevSample(w1Start);
    // Previous sample exists but is NOT contiguous — stepper must treat
    // this as a hole (honest loading), never a silent skip.
    expect(holeEnd).not.toBeNull();
    expect(store.contiguous(holeEnd!.ticks, w1Start)).toBe(false);
  });

  it('dissolves a sub-frame micro-gap between windows (anchor wobble, not a hole)', () => {
    const store = makeStore();
    const gop = uniformGop(30); // 30 × 512 ticks = 1 s, frame interval ≈ 33 ms

    insert(store, makeFragment(0, gop), anchor(T0, 0));
    // Second window lands 10 ms short of flush — sub-frame, so no frame can be
    // missing in the gap. Split coverage here shatters the reverse runway into
    // micro-intervals that can never resume (live-edge wedge).
    insert(store, makeFragment(1_000_000, gop, 2), anchor(T0 - 1010, 1_000_000));

    expect(store.coverage()).toHaveLength(1);
    const w1First = store.sampleNear(T0 * TICKS_PER_MS)!;
    const below = store.prevSample(w1First.ticks)!;
    expect(store.contiguous(below.ticks, w1First.ticks)).toBe(true);
  });
});

// ─── Stitch fingerprint (real spike data) ───────────────────────────────────

describe('SampleStore — overlap re-delivery (spike goldens)', () => {
  const tables = OVERLAP_TABLES;

  function fragmentFromTable(t: OverlapWindow): Fmp4VideoFragment {
    return {
      seq: t.seq,
      trackId: 1,
      baseDts: t.baseDts,
      samples: t.samples.map((s) => ({
        dts: s.dts,
        pts: s.pts,
        duration: s.duration,
        key: s.key,
        bytes: new Uint8Array(s.size),
      })),
    };
  }

  it('dedupes the same archive GOP delivered twice (sizes match, durations jitter)', () => {
    const store = makeStore();
    const a = fragmentFromTable(tables.overlapA);
    const b = fragmentFromTable(tables.overlapB);

    // Anchors map both container windows onto the same archive position —
    // exactly what the per-seek anchor events did in the live capture
    // (seq 31 and seq 140, 23/840360 bytes differing, all in the moof).
    const first = insert(store, a, anchor(T0, tables.overlapA.baseDts));
    expect(first.accepted).toBe(true);

    const again = insert(store, b, anchor(T0, tables.overlapB.baseDts));
    expect(again).toEqual({ accepted: true, addedSamples: 0 });
    expect(store.sampleCount).toBe(tables.overlapA.samples.length);
    expect(store.coverage()).toHaveLength(1);
  });

  it('rejects a re-delivery whose size fingerprint conflicts', () => {
    const store = makeStore();
    insert(store,
      fragmentFromTable(tables.overlapA),
      anchor(T0, tables.overlapA.baseDts),
    );

    const corrupt = fragmentFromTable(tables.overlapB);
    corrupt.samples[10] = {
      ...corrupt.samples[10],
      bytes: new Uint8Array(corrupt.samples[10].bytes.byteLength + 1),
    };
    const result = insert(store, corrupt, anchor(T0, tables.overlapB.baseDts));
    expect(result).toEqual({ accepted: false, reason: 'fingerprint-conflict' });
    expect(store.sampleCount).toBe(tables.overlapA.samples.length);
  });
});

// ─── Disjoint invariant under spanning re-delivery ──────────────────────────

describe('SampleStore — overlap identity hardening', () => {
  /**
   * Middle window first, then a wide window spanning it: the wide window's
   * interior 30 samples dedup against the middle window, so its survivors
   * must split into two disjoint fragments instead of one spanning [0, 90).
   */
  function spanningSetup() {
    const store = makeStore();
    const middle = insert(
      store,
      makeFragment(1_000_000, uniformGop(30), 1),
      anchor(T0 + 1000, 1_000_000),
    );
    const wide = insert(store, makeFragment(0, uniformGop(90), 2), anchor(T0, 0));
    return { store, middle, wide };
  }

  it('splits dedup survivors at skip boundaries (no spanning fragment)', () => {
    const { store, middle, wide } = spanningSetup();
    expect(middle).toEqual({ accepted: true, addedSamples: 30 });
    expect(wide).toEqual({ accepted: true, addedSamples: 60 });
    expect(store.sampleCount).toBe(90);
    expect(store.coverage()).toHaveLength(1);
    // Survivors flush against existing coverage are real frames, not wobble.
    expect(store.phantomDuplicates).toBe(0);
  });

  it('nextSample never skips across an interior window (global best-min scan)', () => {
    const { store } = spanningSetup();
    let s = store.sampleNear(T0 * TICKS_PER_MS)!;
    for (let i = 1; i < 90; i++) {
      const next = store.nextSample(s.ticks);
      expect(next).not.toBeNull();
      // Every step advances by exactly one 512-tick frame — a forward skip
      // over the interior window's samples would jump 30 frames here.
      expect(Math.abs(next!.ticks - s.ticks - 512)).toBeLessThan(1);
      s = next!;
    }
    expect(store.nextSample(s.ticks)).toBeNull();
  });

  it('gopFor returns one tick-sorted run across the fragment seams', () => {
    const { store } = spanningSetup();
    // Target in the wide window's tail: the governing keyframe is the
    // middle window's, so the run crosses both stored fragments.
    const t = T0 * TICKS_PER_MS + 70 * 512;
    const gop = store.gopFor(t);
    expect(gop).not.toBeNull();
    expect(gop!.samples).toHaveLength(41); // middle 30 + tail samples 60…70
    expect(gop!.samples[0].key).toBe(true);
    expect(Math.abs(gop!.samples[0].ticks - (T0 * TICKS_PER_MS + 30 * 512))).toBeLessThan(1);
    expect(gop!.targetIndex).toBe(40);
    expect(Math.abs(gop!.samples[40].ticks - t)).toBeLessThan(1);
    for (let i = 1; i < gop!.samples.length; i++) {
      expect(gop!.samples[i].ticks).toBeGreaterThan(gop!.samples[i - 1].ticks);
    }
  });
});

// ─── Phantom near-duplicate detection (anchor wobble) ───────────────────────

describe('SampleStore — phantom near-duplicates', () => {
  it('snaps a wobbled interior re-delivery onto the stored grid and dedups (M16 → P0.10 → §7.2)', () => {
    const store = makeStore();
    insert(store, makeFragment(0, uniformGop(30)), anchor(T0, 0));

    // The same 30 frames re-delivered with the anchor wobbled +2 ms —
    // beyond the ±1 ms dedup tolerance, far below the 512-tick frame
    // interval. Rejecting outright proved too blunt: wobble is systematic,
    // so rejection holes every window seam. The size sequence identifies the
    // footage — snap onto the stored grid and dedup.
    const result = insert(
      store,
      makeFragment(1_000_000, uniformGop(30), 2),
      anchor(T0 + 2, 1_000_000),
    );
    expect(result).toEqual({ accepted: true, addedSamples: 0 });
    expect(store.sampleCount).toBe(30);
    expect(store.snapStitches).toBe(1);
    expect(store.phantomDuplicates).toBe(0);
    expect(store.coverage()).toHaveLength(1);
  });

  it('snaps edge-band wobble whose sizes match — the seam heals instead of counting a phantom (§7.2)', () => {
    const store = makeStore();
    insert(store, makeFragment(0, uniformGop(30)), anchor(T0, 0));

    // A prepend window whose LAST sample lands 16 ms before the existing
    // first sample — the same physical frame under edge wobble. Its size
    // matches the stored edge sample, so the whole window snaps onto the
    // stored grid: the duplicate dedups and no off-grid seam survives to
    // poison gopFor's interleave refusal.
    const frameMs = 512 / TICKS_PER_MS;
    const aMs = T0 - (1000 - frameMs) - 16;
    const result = insert(store, makeFragment(1_000_000, uniformGop(30), 2), anchor(aMs, 1_000_000));
    expect(result).toEqual({ accepted: true, addedSamples: 29 });
    expect(store.snapStitches).toBe(1);
    expect(store.phantomDuplicates).toBe(0);
    expect(store.coverage()).toHaveLength(1);
  });

  it('still counts edge-band wobble as a phantom when sizes do not identify it', () => {
    const store = makeStore();
    insert(store, makeFragment(0, uniformGop(30)), anchor(T0, 0));

    // Same edge-band landing, but the incoming sizes appear nowhere in the
    // stored window — no alignment evidence, so the sample stays a counted
    // near-duplicate (it may genuinely be a distinct VFR frame).
    const frameMs = 512 / TICKS_PER_MS;
    const aMs = T0 - (1000 - frameMs) - 16;
    const foreign = Array.from({ length: 30 }, () => ({ duration: 512, size: 999 }));
    const result = insert(store, makeFragment(1_000_000, foreign, 2), anchor(aMs, 1_000_000));
    expect(result).toEqual({ accepted: true, addedSamples: 30 });
    expect(store.snapStitches).toBe(0);
    expect(store.phantomDuplicates).toBe(1);
  });

  it('does not count exactly-adjacent windows in either direction', () => {
    const store = makeStore();
    insert(store, makeFragment(0, uniformGop(30)), anchor(T0, 0));
    insert(store, makeFragment(1_000_000, uniformGop(30), 2), anchor(T0 + 1000, 1_000_000));
    insert(store, makeFragment(2_000_000, uniformGop(30), 3), anchor(T0 - 1000, 2_000_000));
    expect(store.phantomDuplicates).toBe(0);
    expect(store.coverage()).toHaveLength(1);
  });
});

// ─── Mis-anchored interleave ────────────────────────────────────────────────

describe('SampleStore — mis-anchored interleave (P0.10)', () => {
  it('rejects a foreign fragment interleaving half a frame off inside coverage', () => {
    const store = makeStore();
    insert(store, makeFragment(0, uniformGop(30)), anchor(T0, 0));

    // The live forensics shape: a keyframe-led fragment whose anchor maps
    // it ~half a frame interval off into covered terrain, carrying its own
    // footage (frag4's sizes appeared nowhere in frag3) — two different
    // recordings would interleave into a phantom double-rate timeline.
    // Foreign sizes mean no sequence alignment exists: reject.
    const halfFrameMs = 512 / TICKS_PER_MS / 2;
    const foreign = Array.from({ length: 19 }, () => ({ duration: 512, size: 777 }));
    const result = insert(
      store,
      makeFragment(1_000_000, foreign, 2),
      anchor(T0 + halfFrameMs, 1_000_000),
    );
    expect(result).toEqual({ accepted: false, reason: 'interleave-conflict' });
    expect(store.sampleCount).toBe(30);
    expect(store.snapStitches).toBe(0);
    expect(store.coverage()).toHaveLength(1);
    // The store stays decodable at the overlap.
    expect(store.gopFor(T0 * TICKS_PER_MS + 10 * 512)).not.toBeNull();
  });

  it('snaps a half-frame-wobbled SAME-footage re-delivery instead of holing the seam (§7.2)', () => {
    const store = makeStore();
    insert(store, makeFragment(0, variedGop(30)), anchor(T0, 0));

    // The systematic DESKTOP-NUC band: extendBack overlap re-delivered
    // under an anchor wobbled half a frame. The size sequence matches the
    // stored samples exactly — same footage, so it must snap and dedup,
    // never reject (rejection left a ~1 s hole between every window).
    const halfFrameMs = 512 / TICKS_PER_MS / 2;
    const result = insert(
      store,
      makeFragment(1_000_000, variedGop(30), 2),
      anchor(T0 + halfFrameMs, 1_000_000),
    );
    expect(result).toEqual({ accepted: true, addedSamples: 0 });
    expect(store.sampleCount).toBe(30);
    expect(store.snapStitches).toBe(1);
    expect(store.coverage()).toHaveLength(1);
    expect(store.gopFor(T0 * TICKS_PER_MS + 10 * 512)).not.toBeNull();
  });

  it('snaps an overlap window so its NEW terrain extends the stored grid coherently (§7.2)', () => {
    const store = makeStore();
    insert(store, makeFragment(0, variedGop(30)), anchor(T0, 0));

    // extendBack shape: a window overlapping the stored window's first 10
    // samples and reaching 20 frames further back, wobbled half a frame.
    // The overlap identifies the footage; the whole window re-bases onto
    // the stored grid, so the new terrain lands grid-consistent and the
    // coverage merges into ONE interval (no hole, no jump-skip).
    const overlap = variedGop(30).slice(0, 10);
    const specs = [...variedGop(20).map((s) => ({ ...s, size: s.size + 4096 })), ...overlap];
    const halfFrameMs = 512 / TICKS_PER_MS / 2;
    const aMs = T0 - 20 * (512 / TICKS_PER_MS) + halfFrameMs;
    const result = insert(store, makeFragment(1_000_000, specs, 2), anchor(aMs, 1_000_000));
    expect(result).toEqual({ accepted: true, addedSamples: 20 });
    expect(store.snapStitches).toBe(1);
    expect(store.coverage()).toHaveLength(1);
    expect(store.sampleCount).toBe(50);

    // The seam is walkable: 49 strictly-decreasing prev steps, all ~512
    // ticks apart — no sub-frame interleave gap, no missing frame.
    let t = store.floorSample(T0 * TICKS_PER_MS + 29 * 512 + 1)!.ticks;
    for (let i = 0; i < 49; i++) {
      const prev = store.prevSample(t);
      expect(prev).not.toBeNull();
      expect(Math.abs(t - prev!.ticks - 512)).toBeLessThan(1);
      t = prev!.ticks;
    }
    expect(store.prevSample(t)).toBeNull();
  });

  it('inserts an adjacent aim\'s keyframe wobble-squeezed onto a coverage edge — a seam, not a conflict', () => {
    const store = makeStore();
    // Previous aim's GOP whose final sample carries the server's degenerate
    // ~1 ms fragment-final duration (observed live on DWC).
    const prevGop = [...variedGop(29), { duration: 15, size: 1480 }];
    insert(store, makeFragment(0, prevGop), anchor(T0, 0));

    // The next aim's keyframe lands 0.9 ms after the stored edge sample —
    // cross-aim wobble squeezed the seam below the dedup epsilon. The sizes
    // differ (ADJACENT frames, not an identity pair): rejecting this as a
    // fingerprint conflict holed every island seam live.
    const aMs = T0 + (29 * 512 + 14) / TICKS_PER_MS;
    const nextGop = variedGop(30).map((s) => ({ ...s, size: s.size + 2000 }));
    const result = insert(store, makeFragment(1_000_000, nextGop, 2), anchor(aMs, 1_000_000));
    expect(result).toEqual({ accepted: true, addedSamples: 30 });
    expect(store.phantomDuplicates).toBe(1);
    expect(store.coverage()).toHaveLength(1);

    // The squeezed pair must not strand the new GOP keyless: the key wins
    // the shared instant and restarts the decode run.
    const t = T0 * TICKS_PER_MS + 29 * 512 + 14 + 5 * 512;
    const gop = store.gopFor(t);
    expect(gop).not.toBeNull();
    expect(gop!.samples[0].key).toBe(true);
    expect(Math.abs(gop!.samples[0].ticks - (T0 * TICKS_PER_MS + 29 * 512 + 14))).toBeLessThan(1);
  });

  it('degenerate fragment-final durations do not collapse the frame-interval bound', () => {
    const store = makeStore();
    insert(store, makeFragment(0, [...variedGop(29), { duration: 15, size: 1480 }]), anchor(T0, 0));

    // The sub-frame interleave refusal keys on the REAL frame interval: a
    // rogue mid-coverage sample half a frame off must still refuse decode
    // even though a 15-tick container artifact sits in the store.
    const rogueTicks = T0 * TICKS_PER_MS + 10 * 512 + 256;
    (store as unknown as { fragments: unknown[] }).fragments.push({
      startTicks: rogueTicks,
      endTicks: rogueTicks + 512,
      byteLength: 999,
      samples: [{ ticks: rogueTicks, durationTicks: 512, key: false, bytes: new Uint8Array(999), configEpoch: 0 }],
    });
    expect(store.gopFor(T0 * TICKS_PER_MS + 11 * 512)).toBeNull();
  });

  it('a poisoned pair only barriers its own seam — a later keyframe re-legitimizes decode above it', () => {
    const store = makeStore();
    // Keys every 5 samples so GOPs exist above and below the rogue.
    const specs = Array.from({ length: 30 }, (_, i) => ({ duration: 512, size: 1000 + i, key: i % 5 === 0 }));
    insert(store, makeFragment(0, specs), anchor(T0, 0));
    const rogueTicks = T0 * TICKS_PER_MS + 10 * 512 + 256;
    (store as unknown as { fragments: unknown[] }).fragments.push({
      startTicks: rogueTicks,
      endTicks: rogueTicks + 512,
      byteLength: 999,
      samples: [{ ticks: rogueTicks, durationTicks: 512, key: false, bytes: new Uint8Array(999), configEpoch: 0 }],
    });
    // Across the pair: still refused (never decode over interleaved wobble)…
    expect(store.gopFor(T0 * TICKS_PER_MS + 11 * 512)).toBeNull();
    // …but a target whose own governing keyframe sits above the pair decodes —
    // one poisoned seam must not make the whole interval unplayable (the
    // reverse buffering↔resume thrash-wedge).
    const above = store.gopFor(T0 * TICKS_PER_MS + 16 * 512);
    expect(above).not.toBeNull();
    expect(Math.abs(above!.samples[0].ticks - (T0 * TICKS_PER_MS + 15 * 512))).toBeLessThan(1);
  });

  it('resolves an off-by-one-frame fingerprint conflict via sequence alignment (§7.2)', () => {
    const store = makeStore();
    insert(store, makeFragment(0, variedGop(30)), anchor(T0, 0));

    // Wobble of exactly one frame: every incoming sample lands ON a stored
    // tick but one index over, so the old path read it as a fingerprint
    // conflict. The shifted size sequence still matches one frame down —
    // alignment finds the shift and the re-delivery dedups.
    const frameMs = 512 / TICKS_PER_MS;
    const result = insert(
      store,
      makeFragment(1_000_000, variedGop(30), 2),
      anchor(T0 + frameMs, 1_000_000),
    );
    expect(result).toEqual({ accepted: true, addedSamples: 0 });
    expect(store.sampleCount).toBe(30);
    expect(store.snapStitches).toBe(1);
    expect(store.coverage()).toHaveLength(1);
  });

  it('a seam-crossing fragment inserts its clean head even when its overlap conflicts (P0.15)', () => {
    const store = makeStore();
    // The island the backward walk is stitching toward.
    insert(store, makeFragment(100_000, variedGop(30)), anchor(T0 + 1_000, 100_000));

    // The seam-crossing GOP: 30 samples of new terrain in front, then 6
    // samples overlapping the island under a mapping wobbled half a frame
    // off with FOREIGN sizes (a poisoned/unalignable overlap — no snap
    // exists). Whole-fragment rejection here bit the GOP tail out of
    // every backfill seam.
    const halfFrameMs = 512 / TICKS_PER_MS / 2;
    const cross = [
      ...variedGop(30).map((s) => ({ ...s, size: s.size + 3 })),
      ...Array.from({ length: 6 }, () => ({ duration: 512, size: 777 })),
    ];
    const result = insert(store, makeFragment(0, cross, 2), anchor(T0 + halfFrameMs, 0));
    expect(result).toEqual({ accepted: true, addedSamples: 30, droppedConflicts: 6 });
    expect(store.seamSplits).toBe(1);
    expect(store.sampleCount).toBe(60);
    // The head reached the island: one merged interval — the seam healed.
    expect(store.coverage()).toHaveLength(1);
  });

  it('a conflicting fragment\'s trailing run past the coverage edge stays out — only the clean prefix inserts (P0.15)', () => {
    const store = makeStore();
    insert(store, makeFragment(0, variedGop(30)), anchor(T0, 0));

    // Mis-anchored FOREIGN fragment 1.5 frames off: 29 samples interior,
    // the last poking just past the coverage edge. The off-coverage
    // sliver shares the bad mapping — inserting it is the poison vector,
    // so a fragment that conflicts from the start still rejects whole.
    const offMs = (512 * 1.5) / TICKS_PER_MS;
    const foreign = variedGop(30).map((s) => ({ ...s, size: s.size + 5_000 }));
    const result = insert(store, makeFragment(1_000_000, foreign, 2), anchor(T0 + offMs, 1_000_000));
    expect(result).toEqual({ accepted: false, reason: 'interleave-conflict' });
    expect(store.sampleCount).toBe(30);
    expect(store.seamSplits).toBe(0);
    expect(store.coverage()).toHaveLength(1);
  });

  it('the fragment-final duration stamp never feeds the frame-interval bound (P0.15)', () => {
    const store = makeStore();
    // 77-tick (~5 ms) final stamp — above the ~1 ms artifact filter, far
    // below the real interval; live it silently collapsed the phantom
    // band, the gopFor refusal, and the snap bound floor.
    insert(store, makeFragment(0, [...variedGop(29), { duration: 77, size: 1480 }]), anchor(T0, 0));

    // The phantom band still spans the REAL frame interval: a fresh
    // sample ~13 ms past the last stored tick is a near-duplicate, not
    // new terrain — with the bound collapsed it would slip through.
    const lastTicks = 29 * 512;
    const result = insert(
      store,
      makeFragment(2_000_000, [{ duration: 512, size: 999 }], 2),
      anchor(T0 + (lastTicks + 200) / TICKS_PER_MS, 2_000_000),
    );
    expect(result).toEqual({ accepted: true, addedSamples: 1 });
    expect(store.phantomDuplicates).toBe(1);
  });

  it('gopFor refuses an interleaved store rather than cross-feeding the decoder', () => {
    const store = makeStore();
    insert(store, makeFragment(0, uniformGop(30)), anchor(T0, 0));

    // Interleave can no longer enter through insertFragment — inject the
    // corruption shape directly as defense-in-depth for paths the insert
    // guard does not see.
    const rogue = makeFragment(1_000_000, uniformGop(19), 2);
    const offset = T0 * TICKS_PER_MS - 1_000_000 + 256;
    const samples = rogue.samples.map((s) => ({
      ticks: offset + s.pts,
      durationTicks: s.duration,
      key: s.key,
      bytes: s.bytes,
      configEpoch: 0,
    }));
    (store as unknown as { fragments: unknown[] }).fragments.push({
      startTicks: samples[0].ticks,
      endTicks: samples[samples.length - 1].ticks + 512,
      byteLength: samples.reduce((n, s) => n + s.bytes.byteLength, 0),
      samples,
    });

    expect(store.gopFor(T0 * TICKS_PER_MS + 10 * 512)).toBeNull();
  });
});

// ─── GOP extraction ─────────────────────────────────────────────────────────

describe('SampleStore — gopFor', () => {
  it('returns the governing keyframe run through the target', () => {
    const store = makeStore();
    // Two GOPs of 5 in one fragment.
    const specs: SampleSpec[] = Array.from({ length: 10 }, (_, i) => ({
      duration: 512,
      size: 100,
      key: i % 5 === 0,
    }));
    insert(store, makeFragment(0, specs), anchor(T0, 0));

    // Target: 8th sample (index 7) — inside the second GOP.
    const t = T0 * TICKS_PER_MS + 7 * 512;
    const gop = store.gopFor(t);
    expect(gop).not.toBeNull();
    expect(gop!.samples).toHaveLength(3); // samples 5, 6, 7
    expect(gop!.samples[0].key).toBe(true);
    expect(gop!.targetIndex).toBe(2);
    expect(gop!.samples[2].ticks).toBeCloseTo(t, 3);
    expect(gop!.config).toEqual({ codec: CODEC, description: AVCC });
  });

  it('returns null for an uncovered position or a keyless run', () => {
    const store = makeStore();
    const noKey = uniformGop(5).map((s) => ({ ...s, key: false }));
    insert(store, makeFragment(0, noKey), anchor(T0, 0));

    expect(store.gopFor(T0 * TICKS_PER_MS + 512)).toBeNull(); // no governing key
    expect(store.gopFor((T0 + 60_000) * TICKS_PER_MS)).toBeNull(); // uncovered
  });
});

// ─── Config registry & codec epochs ─────────────────────────────────────────

describe('SampleStore — config registry', () => {
  const CODEC_B = 'avc1.4d4028';
  const AVCC_B = new Uint8Array([1, 0x4d, 0x40, 0x28]);

  it('returns a stable epoch index and collapses identical configs', () => {
    const store = new SampleStore({ timescale: TIMESCALE });
    const a = store.registerConfig({ codec: CODEC, description: AVCC });
    const aAgain = store.registerConfig({ codec: CODEC, description: new Uint8Array([1, 0x64, 0x00, 0x28]) });
    const b = store.registerConfig({ codec: CODEC_B, description: AVCC_B });

    expect(a).toBe(0);
    expect(aAgain).toBe(0); // byte-identical → same epoch, no needless reconfigure
    expect(b).toBe(1);
    // A → B → A reuses A's epoch.
    expect(store.registerConfig({ codec: CODEC, description: AVCC })).toBe(0);
  });

  it('gopFor surfaces the config of the run, tagged at insert time', () => {
    const store = new SampleStore({ timescale: TIMESCALE });
    const epochA = store.registerConfig({ codec: CODEC, description: AVCC });
    const epochB = store.registerConfig({ codec: CODEC_B, description: AVCC_B });
    const gop = uniformGop(3);

    // Window A at T0 (epoch A); window B one second earlier (epoch B) — a
    // codec boundary in the archive. Each fragment is tagged at insert.
    store.insertFragment(makeFragment(0, gop), anchor(T0, 0), epochA);
    store.insertFragment(makeFragment(1_000_000, gop, 2), anchor(T0 - 1000, 1_000_000), epochB);

    const runA = store.gopFor(T0 * TICKS_PER_MS)!;
    const runB = store.gopFor((T0 - 1000) * TICKS_PER_MS)!;
    expect(runA.config).toEqual({ codec: CODEC, description: AVCC });
    expect(runB.config).toEqual({ codec: CODEC_B, description: AVCC_B });
  });

  it('gopFor returns null when the run config epoch was never registered', () => {
    const store = new SampleStore({ timescale: TIMESCALE });
    // Insert tagged with an unregistered epoch — coverage exists but no config.
    store.insertFragment(makeFragment(0, uniformGop(3)), anchor(T0, 0), 5);
    expect(store.covers(T0 * TICKS_PER_MS)).toBe(true);
    expect(store.gopFor(T0 * TICKS_PER_MS)).toBeNull();
  });
});

// ─── Budget & eviction ──────────────────────────────────────────────────────

describe('SampleStore — byte cap and far-side eviction', () => {
  it('evicts whole fragments farthest from the cursor first', () => {
    const store = makeStore(70_000); // fits two 30 KB fragments, not three
    const gop = uniformGop(30); // 30 KB each

    insert(store, makeFragment(0, gop, 1), anchor(T0, 0));
    insert(store, makeFragment(100_000, gop, 2), anchor(T0 - 1000, 100_000));
    insert(store, makeFragment(200_000, gop, 3), anchor(T0 - 2000, 200_000));
    expect(store.byteLength).toBe(90_000);

    // Cursor sits at the newest window (T0): the oldest (T0−2000) goes.
    store.evictToCap(T0 * TICKS_PER_MS);
    expect(store.byteLength).toBe(60_000);
    expect(store.covers((T0 - 1500) * TICKS_PER_MS)).toBe(false);
    expect(store.covers((T0 - 500) * TICKS_PER_MS)).toBe(true);
    expect(store.covers(T0 * TICKS_PER_MS + 1)).toBe(true);
  });

  it('clear() empties everything', () => {
    const store = makeStore();
    insert(store, makeFragment(0, uniformGop(3)), anchor(T0, 0));
    store.clear();
    expect(store.sampleCount).toBe(0);
    expect(store.byteLength).toBe(0);
    expect(store.coverage()).toHaveLength(0);
  });
});
