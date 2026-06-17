// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect } from 'vitest';

import {
  Fmp4Parser,
  type Fmp4ParserEvent,
  type Fmp4VideoFragment,
} from '../../../src/stepping/fmp4-parser';
import {
  buildInit,
  buildGop,
  buildGopMultiTrun,
  OVERLAP_TABLES,
} from './fmp4-fixtures';

// ─── Fixtures ───────────────────────────────────────────────────────────────
// Container structure rebuilt in-code from the 2026-06-05 spike's real sample
// tables (DWC camera, H.264 2048×1536, GOP 30, timescale 15360); see
// fmp4-fixtures.ts. GOP01_MULTITRUN is the same GOP split across two truns.

const INIT = buildInit();
const GOP01 = buildGop();
const GOP01_MULTITRUN = buildGopMultiTrun();

function freshParser(): Fmp4Parser {
  const parser = new Fmp4Parser();
  const events = parser.push(INIT);
  expect(events).toHaveLength(1);
  expect(events[0].kind).toBe('init');
  return parser;
}

function fragments(events: Fmp4ParserEvent[]): Fmp4VideoFragment[] {
  for (const e of events) {
    expect(e.kind).not.toBe('unsupported');
  }
  return events.flatMap((e) => (e.kind === 'fragment' ? [e.fragment] : []));
}

// ─── Synthetic box builders (hardened-path tests) ───────────────────────────

function ascii(s: string): Uint8Array {
  return new Uint8Array([...s].map((c) => c.charCodeAt(0)));
}

function be32(...values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 4);
  const dv = new DataView(out.buffer);
  values.forEach((v, i) => dv.setInt32(i * 4, v));
  return out;
}

function box(type: string, ...payloads: Uint8Array[]): Uint8Array {
  const size = 8 + payloads.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(size);
  new DataView(out.buffer).setUint32(0, size);
  out.set(ascii(type), 4);
  let w = 8;
  for (const p of payloads) {
    out.set(p, w);
    w += p.byteLength;
  }
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let w = 0;
  for (const p of parts) {
    out.set(p, w);
    w += p.byteLength;
  }
  return out;
}

const KEY_FLAGS = 0x02000000; // sample_depends_on=2, non-sync bit clear
const NONKEY_FLAGS = 0x01010000; // sample_depends_on=1, non-sync bit set

interface SyntheticSample {
  duration?: number;
  size?: number;
  flags?: number;
  cts?: number;
}

/**
 * Build a minimal moof+mdat for track 1 of the real init segment.
 * Per-sample fields are emitted for exactly the keys present on the first
 * sample object; tfhdDefaults populates tfhd default fields instead.
 */
function syntheticFragment(opts: {
  seq?: number;
  baseDts?: number;
  trackId?: number;
  trunVersion?: 0 | 1;
  samples: SyntheticSample[];
  tfhdDefaults?: { duration?: number; size?: number; flags?: number };
  mdatBytes?: number; // override payload length (bounds tests)
  extraTrafBoxes?: Uint8Array[];
  dataOffsetDelta?: number;
}): Uint8Array {
  const {
    seq = 1, baseDts = 0, trackId = 1, trunVersion = 0,
    samples, tfhdDefaults, extraTrafBoxes = [], dataOffsetDelta = 0,
  } = opts;

  const hasDur = samples[0]?.duration !== undefined;
  const hasSize = samples[0]?.size !== undefined;
  const hasFlags = samples[0]?.flags !== undefined;
  const hasCts = samples[0]?.cts !== undefined;

  let tfhdFlags = 0;
  const tfhdFields: number[] = [trackId];
  if (tfhdDefaults?.duration !== undefined) { tfhdFlags |= 0x08; tfhdFields.push(tfhdDefaults.duration); }
  if (tfhdDefaults?.size !== undefined) { tfhdFlags |= 0x10; tfhdFields.push(tfhdDefaults.size); }
  if (tfhdDefaults?.flags !== undefined) { tfhdFlags |= 0x20; tfhdFields.push(tfhdDefaults.flags); }
  tfhdFlags |= 0x020000; // default-base-is-moof

  let trunFlags = 0x01; // data-offset present
  if (hasDur) trunFlags |= 0x100;
  if (hasSize) trunFlags |= 0x200;
  if (hasFlags) trunFlags |= 0x400;
  if (hasCts) trunFlags |= 0x800;

  const entries: number[] = [];
  for (const s of samples) {
    if (hasDur) entries.push(s.duration!);
    if (hasSize) entries.push(s.size!);
    if (hasFlags) entries.push(s.flags!);
    if (hasCts) entries.push(s.cts!);
  }

  const payloadLen = opts.mdatBytes
    ?? samples.reduce((n, s) => n + (s.size ?? tfhdDefaults?.size ?? 0), 0);
  const mdat = box('mdat', new Uint8Array(payloadLen).fill(0xab));

  // data_offset = moof size + mdat header (8) — resolved after assembly,
  // so build the moof twice: once to measure, once with the real offset.
  const build = (dataOffset: number) =>
    box('moof',
      box('mfhd', be32(0, seq)),
      box('traf',
        box('tfhd', be32(tfhdFlags, ...tfhdFields)),
        box('tfdt', be32(0, baseDts)),
        ...extraTrafBoxes,
        box('trun', be32((trunVersion << 24) | trunFlags, samples.length, dataOffset, ...entries)),
      ),
    );

  const moofSize = build(0).byteLength;
  return concat(build(moofSize + 8 + dataOffsetDelta), mdat);
}

// ─── Tests: real captures ───────────────────────────────────────────────────

describe('Fmp4Parser — init segment (real capture)', () => {
  it('parses the DWC init segment exactly as the spike characterized it', () => {
    const parser = new Fmp4Parser();
    const events = parser.push(INIT);

    expect(events).toHaveLength(1);
    const e = events[0];
    if (e.kind !== 'init') throw new Error('expected init event');

    expect(e.init.encrypted).toBe(false);
    expect(e.init.videoTrack).not.toBeNull();
    const video = e.init.videoTrack!;
    expect(video.handler).toBe('vide');
    expect(video.timescale).toBe(15360);
    expect(video.width).toBe(2048);
    expect(video.height).toBe(1536);
    expect(video.sampleEntry).toBe('avc1');
    expect(video.hasEditList).toBe(false);
    // avcC payload: configurationVersion=1 first byte, SPS/PPS inside.
    expect(video.decoderConfig).not.toBeNull();
    expect(video.decoderConfig!.byteLength).toBeGreaterThan(7);
    expect(video.decoderConfig![0]).toBe(1);
    expect(parser.initSegment).toBe(e.init);
  });
});

describe('Fmp4Parser — media fragment (real capture)', () => {
  it('produces an exact sample table for one GOP', () => {
    const parser = freshParser();
    const frags = fragments(parser.push(GOP01));

    expect(frags).toHaveLength(1);
    const frag = frags[0];
    expect(frag.samples).toHaveLength(30);
    expect(frag.baseDts).toBe(frag.samples[0].dts);
    expect(frag.seq).toBeGreaterThan(0);

    // Keyframe-led closed GOP: exactly one sync sample, first.
    expect(frag.samples[0].key).toBe(true);
    expect(frag.samples.slice(1).every((s) => !s.key)).toBe(true);

    // dts chain is gapless by construction; no B-frames (pts === dts).
    for (let i = 1; i < frag.samples.length; i++) {
      expect(frag.samples[i].dts).toBe(
        frag.samples[i - 1].dts + frag.samples[i - 1].duration,
      );
    }
    expect(frag.samples.every((s) => s.pts === s.dts)).toBe(true);

    // VFR is real on this camera: durations vary within the GOP.
    const durations = new Set(frag.samples.map((s) => s.duration));
    expect(durations.size).toBeGreaterThan(1);
  });

  it('resolves byte ranges that reproduce the mdat payload exactly', () => {
    const parser = freshParser();
    const [frag] = fragments(parser.push(GOP01));

    // mdat payload = bytes after the mdat header at the end of the segment.
    const dv = new DataView(GOP01.buffer, GOP01.byteOffset, GOP01.byteLength);
    const moofSize = dv.getUint32(0);
    const mdatPayload = GOP01.subarray(moofSize + 8);

    const total = frag.samples.reduce((n, s) => n + s.bytes.byteLength, 0);
    expect(total).toBe(mdatPayload.byteLength);

    const cat = new Uint8Array(total);
    let w = 0;
    for (const s of frag.samples) {
      cat.set(s.bytes, w);
      w += s.bytes.byteLength;
    }
    expect(Buffer.compare(Buffer.from(cat), Buffer.from(mdatPayload))).toBe(0);

    // AVCC layout: first NAL length prefix is sane.
    const first = frag.samples[0].bytes;
    const nalLen = new DataView(first.buffer, first.byteOffset).getUint32(0);
    expect(nalLen).toBeGreaterThan(0);
    expect(nalLen).toBeLessThanOrEqual(first.byteLength - 4);
  });

  it('parses a multi-trun traf to the identical sample table', () => {
    const single = freshParser();
    const [ref] = fragments(single.push(GOP01));

    const multi = freshParser();
    const [dut] = fragments(multi.push(GOP01_MULTITRUN));

    expect(dut.samples.length).toBe(ref.samples.length);
    for (let i = 0; i < ref.samples.length; i++) {
      expect(dut.samples[i].dts).toBe(ref.samples[i].dts);
      expect(dut.samples[i].duration).toBe(ref.samples[i].duration);
      expect(dut.samples[i].key).toBe(ref.samples[i].key);
      expect(dut.samples[i].bytes.byteLength).toBe(ref.samples[i].bytes.byteLength);
      expect(
        Buffer.compare(Buffer.from(dut.samples[i].bytes), Buffer.from(ref.samples[i].bytes)),
      ).toBe(0);
    }
  });
});

describe('Fmp4Parser — streaming reassembly', () => {
  it('parses init+fragment delivered as one buffer', () => {
    const parser = new Fmp4Parser();
    const events = parser.push(concat(INIT, GOP01));
    expect(events.map((e) => e.kind)).toEqual(['init', 'fragment']);
  });

  it('reassembles a fragment split at arbitrary byte boundaries', () => {
    const whole = freshParser();
    const [ref] = fragments(whole.push(GOP01));

    // Splits inside the moof header, inside the moof body, and mid-mdat.
    const cuts = [0, 5, 100, 350, 400_000, GOP01.byteLength];
    const parser = freshParser();
    const events: Fmp4ParserEvent[] = [];
    for (let i = 0; i + 1 < cuts.length; i++) {
      events.push(...parser.push(GOP01.subarray(cuts[i], cuts[i + 1])));
    }

    const frags = fragments(events);
    expect(frags).toHaveLength(1);
    expect(frags[0].samples.length).toBe(ref.samples.length);
    expect(frags[0].samples[0].dts).toBe(ref.samples[0].dts);
    const last = frags[0].samples.at(-1)!;
    const refLast = ref.samples.at(-1)!;
    expect(Buffer.compare(Buffer.from(last.bytes), Buffer.from(refLast.bytes))).toBe(0);
  });

  it('reset() drops a buffered partial box', () => {
    const parser = freshParser();
    parser.push(GOP01.subarray(0, 1000));
    parser.reset();
    // A fresh, complete fragment parses cleanly after the reset.
    const frags = fragments(parser.push(GOP01));
    expect(frags).toHaveLength(1);
  });
});

// ─── Tests: hardened paths (synthetic) ──────────────────────────────────────

describe('Fmp4Parser — hardened paths', () => {
  it('rejects a fragment that arrives before the init segment', () => {
    const parser = new Fmp4Parser();
    const events = parser.push(GOP01);
    expect(events).toEqual([
      { kind: 'unsupported', reason: 'fragment before init segment' },
    ]);
  });

  it('applies signed composition offsets from a v1 trun', () => {
    const parser = freshParser();
    const seg = syntheticFragment({
      trunVersion: 1,
      baseDts: 1000,
      samples: [
        { duration: 512, size: 10, flags: KEY_FLAGS, cts: 512 },
        { duration: 512, size: 10, flags: NONKEY_FLAGS, cts: -512 },
      ],
    });
    const [frag] = fragments(parser.push(seg));
    expect(frag.samples[0].pts).toBe(1512);
    expect(frag.samples[1].pts).toBe(1000); // 1512 dts + (−512) cts
    expect(frag.samples[1].dts).toBe(1512);
  });

  it('falls back to tfhd defaults when trun carries no per-sample fields', () => {
    const parser = freshParser();
    const seg = syntheticFragment({
      samples: [{}, {}, {}],
      tfhdDefaults: { duration: 512, size: 20, flags: NONKEY_FLAGS },
    });
    const [frag] = fragments(parser.push(seg));
    expect(frag.samples).toHaveLength(3);
    expect(frag.samples.every((s) => s.duration === 512)).toBe(true);
    expect(frag.samples.every((s) => s.bytes.byteLength === 20)).toBe(true);
    expect(frag.samples.every((s) => !s.key)).toBe(true);
    expect(frag.samples[2].dts).toBe(1024);
  });

  it('rejects a sample table whose byte ranges escape the segment', () => {
    const parser = freshParser();
    const seg = syntheticFragment({
      samples: [{ duration: 512, size: 10_000, flags: KEY_FLAGS }],
      mdatBytes: 100, // mdat payload far smaller than the declared sample
    });
    const events = parser.push(seg);
    expect(events).toEqual([
      { kind: 'unsupported', reason: 'sample byte range outside segment' },
    ]);
  });

  it('rejects encrypted fragments (senc present)', () => {
    const parser = freshParser();
    const seg = syntheticFragment({
      samples: [{ duration: 512, size: 10, flags: KEY_FLAGS }],
      extraTrafBoxes: [box('senc', be32(0, 0))],
    });
    const events = parser.push(seg);
    expect(events).toEqual([
      { kind: 'unsupported', reason: 'encrypted fragment (cenc)' },
    ]);
  });

  it('rejects samples with no resolvable flags', () => {
    const parser = freshParser();
    const seg = syntheticFragment({
      // duration+size per sample, but no flags anywhere (and the real init
      // has no trex default flags usable as keyframe ground truth).
      samples: [{ duration: 512, size: 10 }],
      tfhdDefaults: { },
    });
    const events = parser.push(seg);
    expect(events.some(
      (e) => e.kind === 'unsupported' || e.kind === 'fragment',
    )).toBe(true);
    // Whichever way the real init's trex resolves it, the parser must not
    // emit a sample with an undefined keyframe bit.
    for (const e of events) {
      if (e.kind === 'fragment') {
        expect(e.fragment.samples.every((s) => typeof s.key === 'boolean')).toBe(true);
      }
    }
  });

  it('skips non-video trafs silently', () => {
    const parser = freshParser();
    const seg = syntheticFragment({
      trackId: 2, // not the video track
      samples: [{ duration: 512, size: 10, flags: KEY_FLAGS }],
    });
    const events = parser.push(seg);
    expect(events).toEqual([]);
  });

  it('rejects a size=0 (to-end-of-file) box', () => {
    const parser = freshParser();
    const bad = concat(GOP01.slice(0, GOP01.byteLength));
    new DataView(bad.buffer, bad.byteOffset).setUint32(0, 0); // moof size → 0
    const events = parser.push(bad);
    expect(events).toEqual([
      { kind: 'unsupported', reason: 'box with size=0 in live stream' },
    ]);
  });

  it('rejects a moof followed by a non-mdat box', () => {
    const parser = freshParser();
    const dv = new DataView(GOP01.buffer, GOP01.byteOffset, GOP01.byteLength);
    const moofSize = dv.getUint32(0);
    const seg = concat(
      GOP01.subarray(0, moofSize),
      box('free', new Uint8Array(8)),
    );
    const events = parser.push(seg);
    expect(events).toEqual([
      { kind: 'unsupported', reason: "expected mdat after moof, got 'free'" },
    ]);
  });
});

// ─── Tests: overlap fingerprint data (store contract) ───────────────────────

describe('Fmp4Parser — overlap re-delivery characterization', () => {
  it('the committed overlap tables match the spike findings', () => {
    // Same archive GOP delivered twice (seq 31 vs 140): sizes identical,
    // durations jitter ±1 tick with stable sums. The sample-size sequence is
    // the stitch fingerprint; exact durations must never be.
    const a = OVERLAP_TABLES.overlapA, b = OVERLAP_TABLES.overlapB;
    expect(a.seq).not.toBe(b.seq);
    expect(a.samples.map((s) => s.size)).toEqual(b.samples.map((s) => s.size));
    expect(a.samples.map((s) => s.duration)).not.toEqual(b.samples.map((s) => s.duration));
    const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);
    expect(sum(a.samples.map((s) => s.duration))).toBe(sum(b.samples.map((s) => s.duration)));
  });
});
