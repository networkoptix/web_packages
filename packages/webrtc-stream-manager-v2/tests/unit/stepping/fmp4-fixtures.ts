// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

// In-code fMP4 fixtures for the stepping parser / fetcher / store suites.
//
// These reproduce the *container structure* of the 2026-06-05 DESKTOP-NUC spike
// capture (H.264 2048×1536, GOP 30, timescale 15360) from readable numbers —
// the real per-sample durations/sizes the camera emitted — while synthesising
// the mdat payload. No encoded frame data is stored: each sample's payload is a
// deterministic per-index pattern carrying only a valid NAL length prefix, so
// byte-range slicing is still genuinely exercised. Nothing in the suite decodes
// pixels (WebCodecs is mocked), so this keeps the structural coverage with none
// of the original footage.

const enc = new TextEncoder();

function ascii(s: string): number[] {
  return Array.from(enc.encode(s));
}

/** Big-endian uint32 as 4 bytes. */
function u32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

/** Assemble an ISO-BMFF box; large Uint8Array payloads are copied, not spread. */
function box(type: string, ...parts: Array<number[] | Uint8Array>): Uint8Array {
  let len = 0;
  for (const p of parts) {
    len += p.length;
  }
  const out = new Uint8Array(8 + len);
  new DataView(out.buffer).setUint32(0, 8 + len);
  out.set(enc.encode(type), 4);
  let w = 8;
  for (const p of parts) {
    out.set(p instanceof Uint8Array ? p : Uint8Array.from(p), w);
    w += p.length;
  }
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const p of parts) {
    len += p.byteLength;
  }
  const out = new Uint8Array(len);
  let w = 0;
  for (const p of parts) {
    out.set(p, w);
    w += p.byteLength;
  }
  return out;
}

// ─── Real, footage-free container facts (from the spike capture) ─────────────

export const VIDEO_TIMESCALE = 15360;
export const VIDEO_WIDTH = 2048;
export const VIDEO_HEIGHT = 1536;
export const GOP01_SEQ = 1;
export const GOP01_BASE_DTS = 0;

/** The camera's real per-sample decode durations for the first GOP (VFR). */
export const GOP01_DURATIONS = [
  169, 507, 537, 461, 507, 568, 446, 507, 630, 414,
  492, 599, 491, 461, 553, 476, 476, 661, 399, 492,
  568, 522, 446, 583, 461, 507, 553, 461, 491, 937,
];

/** The camera's real per-sample byte sizes for the first GOP. */
export const GOP01_SIZES = [
  238796, 16880, 17553, 31933, 15670, 31459, 27507, 15018, 17325, 30808,
  27073, 14852, 29065, 25629, 25382, 14311, 27987, 14570, 16107, 29651,
  14634, 16304, 17357, 17303, 17530, 30691, 9723, 12199, 12569, 13233,
];

export const GOP01_SAMPLE_COUNT = GOP01_DURATIONS.length;

const KEY_FLAGS = 0x02000000; // sample_depends_on=2, non-sync bit clear
const NONKEY_FLAGS = 0x01010000; // sample_depends_on=1, non-sync bit set

// avcC (AVCDecoderConfigurationRecord): bytes [1..3] = profile/compat/level →
// codec string avc1.420032. No real SPS is needed — width/height come from the
// VisualSampleEntry, and nothing decodes — so the SPS/PPS NALs are placeholders.
const AVCC = Uint8Array.from([
  0x01, 0x42, 0x00, 0x32, // configurationVersion, profile, compat, level
  0xff, // lengthSizeMinusOne → 4-byte NAL length
  0xe1, 0x00, 0x04, 0x67, 0x42, 0x00, 0x32, // numSPS=1, len 4, placeholder SPS
  0x01, 0x00, 0x02, 0x68, 0xce, // numPPS=1, len 2, placeholder PPS
]);

/** A real-structured init segment (ftyp + moov) carrying the spike's track config. */
export function buildInit(avcc: Uint8Array = AVCC): Uint8Array {
  const ftyp = box('ftyp', ascii('iso5'), u32(0), ascii('iso5iso6mp41'));
  const mvhd = box('mvhd', new Array(100).fill(0)); // unread by the parser
  const tkhd = box(
    'tkhd',
    u32(0), u32(0), u32(0), // version/flags, creation, modification
    u32(1), // track_ID (parser reads payload+12)
    new Array(84 - 16).fill(0), // remaining v0 fields, all unread
  );
  const mdhd = box(
    'mdhd',
    u32(0), u32(0), u32(0), // version/flags, creation, modification
    u32(VIDEO_TIMESCALE), // timescale (parser reads payload+12)
    u32(0), [0, 0, 0, 0], // duration, language + pre_defined
  );
  const hdlr = box(
    'hdlr',
    u32(0), u32(0), // version/flags, pre_defined
    ascii('vide'), // handler_type (parser reads payload+8)
    u32(0), u32(0), u32(0), ascii('VideoHandler'), [0], // reserved + name
  );
  // VisualSampleEntry: 78-byte header so avcC lands at entry+86.
  const vse: number[] = [
    ...new Array(6).fill(0), // reserved
    0, 1, // data_reference_index
    ...new Array(16).fill(0), // pre_defined / reserved
    ...u32(VIDEO_WIDTH).slice(2), // width  (entry+32)
    ...u32(VIDEO_HEIGHT).slice(2), // height (entry+34)
    ...u32(0x00480000), ...u32(0x00480000), // horiz/vert resolution
    ...u32(0), // reserved
    0, 1, // frame_count
    ...new Array(32).fill(0), // compressorname
    0x00, 0x18, // depth
    0xff, 0xff, // pre_defined = -1
  ];
  const avc1 = box('avc1', vse, box('avcC', avcc));
  const stsd = box('stsd', u32(0), u32(1), avc1);
  const trak = box('trak', tkhd, box('mdia', mdhd, hdlr, box('minf', box('stbl', stsd))));
  const mvex = box('mvex', box('trex', u32(0), u32(1), u32(1), u32(0), u32(0), u32(0)));
  return concat(ftyp, box('moov', mvhd, trak, mvex));
}

/**
 * Synthetic mdat payload: each sample begins with a 4-byte NAL length prefix
 * (size − 4) the parser sanity-checks, followed by a per-sample byte pattern so
 * a wrong byte range is detectable. Carries no real frame data.
 */
function buildPayload(sizes: number[]): Uint8Array {
  const total = sizes.reduce((a, b) => a + b, 0);
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  let p = 0;
  for (let i = 0; i < sizes.length; i++) {
    const sz = sizes[i];
    dv.setUint32(p, sz - 4);
    for (let k = 4; k < sz; k++) {
      out[p + k] = (i * 31 + k) & 0xff;
    }
    p += sz;
  }
  return out;
}

interface FragmentOpts {
  seq?: number;
  baseDts?: number;
  durations?: number[];
  sizes?: number[];
  /** Per-trun sample counts; defaults to a single trun over all samples. */
  trunSplits?: number[];
}

function buildFragment(opts: FragmentOpts = {}): Uint8Array {
  const seq = opts.seq ?? GOP01_SEQ;
  const baseDts = opts.baseDts ?? GOP01_BASE_DTS;
  const durations = opts.durations ?? GOP01_DURATIONS;
  const sizes = opts.sizes ?? GOP01_SIZES;
  const splits = opts.trunSplits ?? [durations.length];
  const payload = buildPayload(sizes);

  const buildMoof = (offsets: number[]): Uint8Array => {
    const truns: Uint8Array[] = [];
    let idx = 0;
    splits.forEach((n, t) => {
      const isFirst = t === 0;
      const flags = 0x1 | (isFirst ? 0x4 : 0) | 0x100 | 0x200;
      const head: number[] = [...u32(flags), ...u32(n), ...u32(offsets[t])];
      if (isFirst) {
        head.push(...u32(KEY_FLAGS)); // first-sample-flags → sample 0 is the keyframe
      }
      const entries: number[] = [];
      for (let i = 0; i < n; i++) {
        entries.push(...u32(durations[idx + i]), ...u32(sizes[idx + i]));
      }
      truns.push(box('trun', head, entries));
      idx += n;
    });
    const mfhd = box('mfhd', u32(0), u32(seq));
    // tfhd flags 0x020038: default-base-is-moof + default duration/size/flags.
    const tfhd = box('tfhd', u32(0x020038), u32(1), u32(durations[0]), u32(sizes[0]), u32(NONKEY_FLAGS));
    const tfdt = box('tfdt', u32(0), u32(baseDts));
    return box('moof', mfhd, box('traf', tfhd, tfdt, ...truns));
  };

  // data_offset is segment-relative; the moof size is fixed regardless of the
  // offset values, so measure once then place the payload after it.
  const moofSize = buildMoof(splits.map(() => 0)).byteLength;
  const offsets: number[] = [];
  let dataPos = moofSize + 8;
  let idx = 0;
  for (const n of splits) {
    offsets.push(dataPos);
    for (let i = 0; i < n; i++) {
      dataPos += sizes[idx + i];
    }
    idx += n;
  }
  return concat(buildMoof(offsets), box('mdat', payload));
}

/** The real first GOP as a single-trun moof+mdat. */
export function buildGop(opts: FragmentOpts = {}): Uint8Array {
  return buildFragment(opts);
}

/** The same GOP delivered as two truns (15+15) — must parse to an identical table. */
export function buildGopMultiTrun(opts: FragmentOpts = {}): Uint8Array {
  return buildFragment({ ...opts, trunSplits: [15, 15] });
}

// ─── Overlap re-delivery fingerprint tables (footage-free numeric data) ──────
// The same archive GOP delivered twice (seq 31 vs 140): byte sizes identical,
// durations jitter ±1 tick with stable sums. Moved verbatim from the deleted
// overlap-tables.json fixture. Sample tables only — no media.

export interface OverlapSample {
  dts: number; pts: number; duration: number; key: boolean; size: number;
}
export interface OverlapWindow { seq: number; baseDts: number; samples: OverlapSample[]; }

export const OVERLAP_TABLES: { overlapA: OverlapWindow; overlapB: OverlapWindow } = {
  "overlapA": {
    "seq": 31,
    "baseDts": 461015,
    "samples": [
      {
        "dts": 461015,
        "pts": 461015,
        "duration": 230,
        "key": true,
        "size": 238482
      },
      {
        "dts": 461245,
        "pts": 461245,
        "duration": 538,
        "key": false,
        "size": 15515
      },
      {
        "dts": 461783,
        "pts": 461783,
        "duration": 445,
        "key": false,
        "size": 16922
      },
      {
        "dts": 462228,
        "pts": 462228,
        "duration": 553,
        "key": false,
        "size": 17698
      },
      {
        "dts": 462781,
        "pts": 462781,
        "duration": 507,
        "key": false,
        "size": 17959
      },
      {
        "dts": 463288,
        "pts": 463288,
        "duration": 584,
        "key": false,
        "size": 18322
      },
      {
        "dts": 463872,
        "pts": 463872,
        "duration": 430,
        "key": false,
        "size": 32842
      },
      {
        "dts": 464302,
        "pts": 464302,
        "duration": 507,
        "key": false,
        "size": 14674
      },
      {
        "dts": 464809,
        "pts": 464809,
        "duration": 630,
        "key": false,
        "size": 30616
      },
      {
        "dts": 465439,
        "pts": 465439,
        "duration": 414,
        "key": false,
        "size": 15282
      },
      {
        "dts": 465853,
        "pts": 465853,
        "duration": 477,
        "key": false,
        "size": 17914
      },
      {
        "dts": 466330,
        "pts": 466330,
        "duration": 599,
        "key": false,
        "size": 32613
      },
      {
        "dts": 466929,
        "pts": 466929,
        "duration": 522,
        "key": false,
        "size": 15592
      },
      {
        "dts": 467451,
        "pts": 467451,
        "duration": 415,
        "key": false,
        "size": 31799
      },
      {
        "dts": 467866,
        "pts": 467866,
        "duration": 599,
        "key": false,
        "size": 16169
      },
      {
        "dts": 468465,
        "pts": 468465,
        "duration": 476,
        "key": false,
        "size": 18709
      },
      {
        "dts": 468941,
        "pts": 468941,
        "duration": 445,
        "key": false,
        "size": 32189
      },
      {
        "dts": 469386,
        "pts": 469386,
        "duration": 661,
        "key": false,
        "size": 16915
      },
      {
        "dts": 470047,
        "pts": 470047,
        "duration": 414,
        "key": false,
        "size": 19865
      },
      {
        "dts": 470461,
        "pts": 470461,
        "duration": 492,
        "key": false,
        "size": 20561
      },
      {
        "dts": 470953,
        "pts": 470953,
        "duration": 584,
        "key": false,
        "size": 20689
      },
      {
        "dts": 471537,
        "pts": 471537,
        "duration": 522,
        "key": false,
        "size": 20449
      },
      {
        "dts": 472059,
        "pts": 472059,
        "duration": 399,
        "key": false,
        "size": 21148
      },
      {
        "dts": 472458,
        "pts": 472458,
        "duration": 615,
        "key": false,
        "size": 20935
      },
      {
        "dts": 473073,
        "pts": 473073,
        "duration": 460,
        "key": false,
        "size": 20560
      },
      {
        "dts": 473533,
        "pts": 473533,
        "duration": 507,
        "key": false,
        "size": 20815
      },
      {
        "dts": 474040,
        "pts": 474040,
        "duration": 569,
        "key": false,
        "size": 19970
      },
      {
        "dts": 474609,
        "pts": 474609,
        "duration": 460,
        "key": false,
        "size": 20029
      },
      {
        "dts": 475069,
        "pts": 475069,
        "duration": 461,
        "key": false,
        "size": 13015
      },
      {
        "dts": 475530,
        "pts": 475530,
        "duration": 922,
        "key": false,
        "size": 21760
      }
    ]
  },
  "overlapB": {
    "seq": 140,
    "baseDts": 2127252,
    "samples": [
      {
        "dts": 2127252,
        "pts": 2127252,
        "duration": 231,
        "key": true,
        "size": 238482
      },
      {
        "dts": 2127483,
        "pts": 2127483,
        "duration": 537,
        "key": false,
        "size": 15515
      },
      {
        "dts": 2128020,
        "pts": 2128020,
        "duration": 446,
        "key": false,
        "size": 16922
      },
      {
        "dts": 2128466,
        "pts": 2128466,
        "duration": 553,
        "key": false,
        "size": 17698
      },
      {
        "dts": 2129019,
        "pts": 2129019,
        "duration": 507,
        "key": false,
        "size": 17959
      },
      {
        "dts": 2129526,
        "pts": 2129526,
        "duration": 583,
        "key": false,
        "size": 18322
      },
      {
        "dts": 2130109,
        "pts": 2130109,
        "duration": 431,
        "key": false,
        "size": 32842
      },
      {
        "dts": 2130540,
        "pts": 2130540,
        "duration": 506,
        "key": false,
        "size": 14674
      },
      {
        "dts": 2131046,
        "pts": 2131046,
        "duration": 630,
        "key": false,
        "size": 30616
      },
      {
        "dts": 2131676,
        "pts": 2131676,
        "duration": 415,
        "key": false,
        "size": 15282
      },
      {
        "dts": 2132091,
        "pts": 2132091,
        "duration": 476,
        "key": false,
        "size": 17914
      },
      {
        "dts": 2132567,
        "pts": 2132567,
        "duration": 599,
        "key": false,
        "size": 32613
      },
      {
        "dts": 2133166,
        "pts": 2133166,
        "duration": 522,
        "key": false,
        "size": 15592
      },
      {
        "dts": 2133688,
        "pts": 2133688,
        "duration": 415,
        "key": false,
        "size": 31799
      },
      {
        "dts": 2134103,
        "pts": 2134103,
        "duration": 599,
        "key": false,
        "size": 16169
      },
      {
        "dts": 2134702,
        "pts": 2134702,
        "duration": 476,
        "key": false,
        "size": 18709
      },
      {
        "dts": 2135178,
        "pts": 2135178,
        "duration": 446,
        "key": false,
        "size": 32189
      },
      {
        "dts": 2135624,
        "pts": 2135624,
        "duration": 660,
        "key": false,
        "size": 16915
      },
      {
        "dts": 2136284,
        "pts": 2136284,
        "duration": 415,
        "key": false,
        "size": 19865
      },
      {
        "dts": 2136699,
        "pts": 2136699,
        "duration": 491,
        "key": false,
        "size": 20561
      },
      {
        "dts": 2137190,
        "pts": 2137190,
        "duration": 584,
        "key": false,
        "size": 20689
      },
      {
        "dts": 2137774,
        "pts": 2137774,
        "duration": 522,
        "key": false,
        "size": 20449
      },
      {
        "dts": 2138296,
        "pts": 2138296,
        "duration": 400,
        "key": false,
        "size": 21148
      },
      {
        "dts": 2138696,
        "pts": 2138696,
        "duration": 614,
        "key": false,
        "size": 20935
      },
      {
        "dts": 2139310,
        "pts": 2139310,
        "duration": 461,
        "key": false,
        "size": 20560
      },
      {
        "dts": 2139771,
        "pts": 2139771,
        "duration": 507,
        "key": false,
        "size": 20815
      },
      {
        "dts": 2140278,
        "pts": 2140278,
        "duration": 568,
        "key": false,
        "size": 19970
      },
      {
        "dts": 2140846,
        "pts": 2140846,
        "duration": 461,
        "key": false,
        "size": 20029
      },
      {
        "dts": 2141307,
        "pts": 2141307,
        "duration": 461,
        "key": false,
        "size": 13015
      },
      {
        "dts": 2141768,
        "pts": 2141768,
        "duration": 921,
        "key": false,
        "size": 21760
      }
    ]
  }
};
