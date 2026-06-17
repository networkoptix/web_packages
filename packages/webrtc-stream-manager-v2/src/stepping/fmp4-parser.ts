// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

// Dependency-free streaming fMP4 parser for the prev-frame stepping pipeline.
//
// Consumes an init segment (ftyp/uuid/moov) then self-contained moof+mdat
// fragments arriving as DataChannel frames at arbitrary byte boundaries, and
// emits the video track's sample tables. Anything it cannot parse *exactly*
// surfaces as an `unsupported` event — never a silently wrong sample table.

// ─── Public types ───────────────────────────────────────────────────────────

export interface Fmp4TrackInfo {
  id: number;
  /** Handler type from hdlr ('vide', 'soun', …). */
  handler: string;
  /** Track timescale (ticks/second) from the track's mdhd — NOT mvhd. */
  timescale: number;
  /** Sample entry fourcc ('avc1', 'hvc1', …). */
  sampleEntry: string;
  width?: number;
  height?: number;
  /** avcC/hvcC payload — the `description` for `VideoDecoder.configure()`. Copied, not a view. */
  decoderConfig: Uint8Array | null;
  hasEditList: boolean;
}

export interface Fmp4InitSegment {
  tracks: Fmp4TrackInfo[];
  /** The first 'vide' track — the one stepping operates on. */
  videoTrack: Fmp4TrackInfo | null;
  /** cenc signals present (tenc/pssh) — not parseable without a CDM. */
  encrypted: boolean;
}

export interface Fmp4Sample {
  /** Decode timestamp in track ticks (tfdt-derived; zero-origin per session). */
  dts: number;
  /** Presentation timestamp = dts + composition offset (v1 trun: signed). */
  pts: number;
  /** Sample duration in track ticks. */
  duration: number;
  key: boolean;
  /** Encoded sample bytes — a zero-copy view; holding one pins its segment's ArrayBuffer. */
  bytes: Uint8Array;
}

export interface Fmp4VideoFragment {
  /** mfhd sequence number — continuous per session (free integrity check). */
  seq: number;
  trackId: number;
  /** tfdt baseMediaDecodeTime in track ticks. */
  baseDts: number;
  samples: Fmp4Sample[];
}

export type Fmp4ParserEvent =
  | { kind: 'init'; init: Fmp4InitSegment }
  | { kind: 'fragment'; fragment: Fmp4VideoFragment }
  | { kind: 'unsupported'; reason: string };

// ─── Box-walking primitives ─────────────────────────────────────────────────

interface Box {
  type: string;
  /** Offset of the box header within the scanned buffer. */
  start: number;
  /** Total box size including header. */
  size: number;
  /** Header length (8, or 16 for 64-bit largesize). */
  hdr: number;
  end: number;
  children: Box[];
}

const CONTAINER_TYPES = new Set([
  'moov', 'trak', 'mdia', 'minf', 'stbl', 'moof', 'traf', 'mvex', 'edts',
]);

/**
 * Box types a post-reset resync may lock onto. mdat is deliberately excluded:
 * a stale orphan mdat's garbage-huge size field would wedge the stream behind
 * an unfillable wait.
 */
const RESYNC_FOURCCS = ['ftyp', 'styp', 'moov', 'moof'].map(
  (t) => (t.charCodeAt(0) << 24) | (t.charCodeAt(1) << 16) | (t.charCodeAt(2) << 8) | t.charCodeAt(3),
);
/** Sanity bound on a resync candidate's size field (real moov/moof ≪ this). */
const RESYNC_MAX_BOX_SIZE = 1 << 20;

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

/** Read a 64-bit value as a Number — epoch-µs scale (~2^51) is < 2^53. */
function u64(dv: DataView, off: number): number {
  return dv.getUint32(off) * 4294967296 + dv.getUint32(off + 4);
}

function fourcc(dv: DataView, off: number): string {
  return String.fromCharCode(
    dv.getUint8(off), dv.getUint8(off + 1), dv.getUint8(off + 2), dv.getUint8(off + 3),
  );
}

/** Walk boxes in [start, end); null on a corrupt box (size < header, or overruns the range). */
function scanBoxes(bytes: Uint8Array, start: number, end: number): Box[] | null {
  const dv = view(bytes);
  const boxes: Box[] = [];
  let off = start;
  while (off + 8 <= end) {
    let size = dv.getUint32(off);
    const type = fourcc(dv, off + 4);
    let hdr = 8;
    if (size === 1) {
      if (off + 16 > end) return null;
      size = u64(dv, off + 8);
      hdr = 16;
    } else if (size === 0) {
      size = end - off;
    }
    if (size < hdr || off + size > end) return null;
    const box: Box = { type, start: off, size, hdr, end: off + size, children: [] };
    if (CONTAINER_TYPES.has(type)) {
      const children = scanBoxes(bytes, off + hdr, off + size);
      if (children === null) return null;
      box.children = children;
    }
    boxes.push(box);
    off += size;
  }
  return boxes;
}

function findAll(boxes: Box[], type: string, out: Box[] = []): Box[] {
  for (const b of boxes) {
    if (b.type === type) out.push(b);
    if (b.children.length) findAll(b.children, type, out);
  }
  return out;
}

function find1(boxes: Box[], type: string): Box | null {
  return findAll(boxes, type)[0] ?? null;
}

// ─── tfhd / trun field flags ────────────────────────────────────────────────

const TFHD_BASE_DATA_OFFSET = 0x000001;
const TFHD_SAMPLE_DESC_INDEX = 0x000002;
const TFHD_DEFAULT_DURATION = 0x000008;
const TFHD_DEFAULT_SIZE = 0x000010;
const TFHD_DEFAULT_FLAGS = 0x000020;

const TRUN_DATA_OFFSET = 0x000001;
const TRUN_FIRST_SAMPLE_FLAGS = 0x000004;
const TRUN_SAMPLE_DURATION = 0x000100;
const TRUN_SAMPLE_SIZE = 0x000200;
const TRUN_SAMPLE_FLAGS = 0x000400;
const TRUN_SAMPLE_CTS = 0x000800;

/** sample_is_non_sync_sample (ISO 14496-12 §8.8.3.1). */
function isKeySample(sampleFlags: number): boolean {
  return ((sampleFlags >>> 16) & 0x1) === 0;
}

interface TrexDefaults {
  duration?: number;
  size?: number;
  flags?: number;
}

// ─── Parser ─────────────────────────────────────────────────────────────────

/**
 * Streaming fMP4 parser. Feed every DataChannel frame to {@link push} in
 * arrival order. Any construct outside the verified envelope (encryption,
 * base-data-offset addressing, unresolvable flags, out-of-segment ranges)
 * emits an `unsupported` event and drops the fragment whole — the caller
 * treats that as feature-disable, not a recoverable gap.
 */
export class Fmp4Parser {
  private pending: Uint8Array | null = null;
  private init: Fmp4InitSegment | null = null;
  private trexDefaults = new Map<number, TrexDefaults>();
  /**
   * Set by {@link reset}: post-seek the server streams the old aim for ≥1
   * RTT, so the next bytes may open MID-BOX. Skip until a plausible box
   * header is found — trusting a garbage size field would wedge the stream.
   */
  private resyncing = false;

  get initSegment(): Fmp4InitSegment | null {
    return this.init;
  }

  /** Push raw bytes; returns events for every top-level box completed by this push. */
  push(data: ArrayBuffer | Uint8Array): Fmp4ParserEvent[] {
    const incoming = data instanceof Uint8Array
      ? data
      : new Uint8Array(data);

    let buf: Uint8Array;
    if (this.pending === null || this.pending.byteLength === 0) {
      // Common case (whole fragment in one frame): no concat, zero copy.
      buf = incoming;
    } else {
      buf = new Uint8Array(this.pending.byteLength + incoming.byteLength);
      buf.set(this.pending, 0);
      buf.set(incoming, this.pending.byteLength);
    }

    const events: Fmp4ParserEvent[] = [];
    const dv = view(buf);
    let cursor = 0;

    if (this.resyncing) {
      const found = this.resyncPoint(buf, dv);
      if (found === -1) {
        // Keep a header's worth of tail — a real header may straddle pushes.
        this.pending = buf.byteLength > 7 ? buf.slice(buf.byteLength - 7) : buf.slice();
        return events;
      }
      this.resyncing = false;
      cursor = found;
    }

    // Consume complete top-level boxes; moof waits for its mdat.
    for (;;) {
      const remaining = buf.byteLength - cursor;
      if (remaining < 8) break;

      let size = dv.getUint32(cursor);
      const type = fourcc(dv, cursor + 4);
      let hdr = 8;
      if (size === 1) {
        if (remaining < 16) break;
        size = u64(dv, cursor + 8);
        hdr = 16;
      } else if (size === 0) {
        // "To end of file" is unresolvable in a live stream.
        events.push({ kind: 'unsupported', reason: 'box with size=0 in live stream' });
        this.pending = null;
        return events;
      }
      if (size < hdr) {
        events.push({ kind: 'unsupported', reason: `corrupt box header (${type}, size=${size})` });
        this.pending = null;
        return events;
      }
      if (size > remaining) break; // incomplete — wait for more bytes

      if (type === 'moov') {
        events.push(this.parseInit(buf.subarray(cursor, cursor + size)));
        cursor += size;
        continue;
      }

      if (type === 'moof') {
        // A fragment is moof + its following mdat; wait for both before parsing.
        const mdatStart = cursor + size;
        if (buf.byteLength - mdatStart < 8) break;
        let mdatSize = dv.getUint32(mdatStart);
        let mdatHdr = 8;
        if (mdatSize === 1) {
          if (buf.byteLength - mdatStart < 16) break;
          mdatSize = u64(dv, mdatStart + 8);
          mdatHdr = 16;
        }
        const mdatType = fourcc(dv, mdatStart + 4);
        if (mdatType !== 'mdat') {
          events.push({ kind: 'unsupported', reason: `expected mdat after moof, got '${mdatType}'` });
          this.pending = null;
          return events;
        }
        if (mdatSize < mdatHdr) {
          events.push({ kind: 'unsupported', reason: 'corrupt mdat header' });
          this.pending = null;
          return events;
        }
        if (mdatStart + mdatSize > buf.byteLength) break; // mdat incomplete

        const segment = buf.subarray(cursor, mdatStart + mdatSize);
        events.push(...this.parseFragment(segment));
        cursor = mdatStart + mdatSize;
        continue;
      }

      // ftyp, uuid, styp, sidx, free, prft, emsg, orphan mdat, … — skip.
      cursor += size;
    }

    this.pending = cursor < buf.byteLength ? buf.subarray(cursor) : null;
    return events;
  }

  /** Drop the buffered partial box and resync at the next plausible box header (see {@link resyncing}). */
  reset(): void {
    this.pending = null;
    this.resyncing = true;
  }

  /** Earliest plausible top-level box header in `buf`, or -1. */
  private resyncPoint(buf: Uint8Array, dv: DataView): number {
    for (let off = 0; off + 8 <= buf.byteLength; off++) {
      if (!RESYNC_FOURCCS.includes(dv.getUint32(off + 4))) continue;
      const size = dv.getUint32(off);
      if (size >= 8 && size <= RESYNC_MAX_BOX_SIZE) {
        return off;
      }
    }
    return -1;
  }

  // ── Init segment ──────────────────────────────────────────────────────

  private parseInit(moovBytes: Uint8Array): Fmp4ParserEvent {
    const dv = view(moovBytes);
    const boxes = scanBoxes(moovBytes, 0, moovBytes.byteLength);
    const moov = boxes && find1(boxes, 'moov');
    if (!moov) {
      return { kind: 'unsupported', reason: 'corrupt moov' };
    }

    const tracks: Fmp4TrackInfo[] = [];
    let encrypted = findAll(moov.children, 'pssh').length > 0;

    for (const trak of findAll(moov.children, 'trak')) {
      const track: Fmp4TrackInfo = {
        id: -1,
        handler: '',
        timescale: 0,
        sampleEntry: '',
        decoderConfig: null,
        hasEditList: find1(trak.children, 'elst') !== null,
      };

      const tkhd = find1(trak.children, 'tkhd');
      if (tkhd) {
        const v = dv.getUint8(tkhd.start + tkhd.hdr);
        track.id = dv.getUint32(tkhd.start + tkhd.hdr + (v === 1 ? 20 : 12));
      }
      const mdhd = find1(trak.children, 'mdhd');
      if (mdhd) {
        const v = dv.getUint8(mdhd.start + mdhd.hdr);
        track.timescale = dv.getUint32(mdhd.start + mdhd.hdr + (v === 1 ? 20 : 12));
      }
      const hdlr = find1(trak.children, 'hdlr');
      if (hdlr) {
        track.handler = fourcc(dv, hdlr.start + hdlr.hdr + 8);
      }
      if (findAll(trak.children, 'tenc').length) {
        encrypted = true;
      }

      const stsd = find1(trak.children, 'stsd');
      if (stsd) {
        // stsd: fullbox(4) + entry_count(4), then the first sample entry.
        const entryStart = stsd.start + stsd.hdr + 8;
        track.sampleEntry = fourcc(dv, entryStart + 4);
        if (track.handler === 'vide') {
          // VisualSampleEntry: width/height at +32/+34, child boxes at +86.
          track.width = dv.getUint16(entryStart + 32);
          track.height = dv.getUint16(entryStart + 34);
          const entrySize = dv.getUint32(entryStart);
          const inner = scanBoxes(
            moovBytes,
            entryStart + 86,
            Math.min(stsd.end, entryStart + entrySize),
          );
          for (const ib of inner ?? []) {
            if (ib.type === 'avcC' || ib.type === 'hvcC') {
              track.decoderConfig = moovBytes.slice(ib.start + ib.hdr, ib.end);
            }
          }
        }
      }

      tracks.push(track);
    }

    this.trexDefaults.clear();
    const mvex = find1(moov.children, 'mvex');
    if (mvex) {
      for (const trex of findAll(mvex.children, 'trex')) {
        this.trexDefaults.set(dv.getUint32(trex.start + trex.hdr + 4), {
          duration: dv.getUint32(trex.start + trex.hdr + 12),
          size: dv.getUint32(trex.start + trex.hdr + 16),
          flags: dv.getUint32(trex.start + trex.hdr + 20),
        });
      }
    }

    const videoTrack = tracks.find((t) => t.handler === 'vide') ?? null;
    this.init = { tracks, videoTrack, encrypted };
    return { kind: 'init', init: this.init };
  }

  // ── Media fragment ────────────────────────────────────────────────────

  /**
   * Parse one moof+mdat segment. Sample byte ranges are resolved relative to
   * segment start (the default-base-is-moof anchor) and bounds-checked before
   * any sample is emitted.
   */
  private parseFragment(segment: Uint8Array): Fmp4ParserEvent[] {
    if (!this.init) {
      return [{ kind: 'unsupported', reason: 'fragment before init segment' }];
    }
    const videoTrackId = this.init.videoTrack?.id;
    if (videoTrackId === undefined) {
      return [{ kind: 'unsupported', reason: 'no video track in init segment' }];
    }

    const dv = view(segment);
    const boxes = scanBoxes(segment, 0, segment.byteLength);
    const moof = boxes && find1(boxes, 'moof');
    if (!moof) {
      return [{ kind: 'unsupported', reason: 'corrupt moof' }];
    }

    const mfhd = find1(moof.children, 'mfhd');
    const seq = mfhd ? dv.getUint32(mfhd.start + mfhd.hdr + 4) : -1;

    const events: Fmp4ParserEvent[] = [];

    for (const traf of findAll(moof.children, 'traf')) {
      if (findAll(traf.children, 'senc').length || findAll(traf.children, 'saiz').length) {
        return [{ kind: 'unsupported', reason: 'encrypted fragment (cenc)' }];
      }

      const tfhd = find1(traf.children, 'tfhd');
      if (!tfhd) {
        return [{ kind: 'unsupported', reason: 'traf without tfhd' }];
      }

      const tfhdFlags = dv.getUint32(tfhd.start + tfhd.hdr) & 0xffffff;
      let off = tfhd.start + tfhd.hdr + 4;
      const trackId = dv.getUint32(off);
      off += 4;

      if (tfhdFlags & TFHD_BASE_DATA_OFFSET) {
        // Absolute file offsets are meaningless in a stream; envelope is default-base-is-moof.
        return [{ kind: 'unsupported', reason: 'tfhd base-data-offset addressing' }];
      }
      if (tfhdFlags & TFHD_SAMPLE_DESC_INDEX) off += 4;

      const trex = this.trexDefaults.get(trackId) ?? {};
      let defaultDuration = trex.duration;
      let defaultSize = trex.size;
      let defaultFlags = trex.flags;
      if (tfhdFlags & TFHD_DEFAULT_DURATION) { defaultDuration = dv.getUint32(off); off += 4; }
      if (tfhdFlags & TFHD_DEFAULT_SIZE) { defaultSize = dv.getUint32(off); off += 4; }
      if (tfhdFlags & TFHD_DEFAULT_FLAGS) { defaultFlags = dv.getUint32(off); off += 4; }

      if (trackId !== videoTrackId) continue; // audio etc. — skip silently

      const tfdt = find1(traf.children, 'tfdt');
      if (!tfdt) {
        return [{ kind: 'unsupported', reason: 'video traf without tfdt' }];
      }
      const tfdtVersion = dv.getUint8(tfdt.start + tfdt.hdr);
      const baseDts = tfdtVersion === 1
        ? u64(dv, tfdt.start + tfdt.hdr + 4)
        : dv.getUint32(tfdt.start + tfdt.hdr + 4);

      const samples: Fmp4Sample[] = [];
      let dts = baseDts;
      // A trun without an explicit data_offset continues where the previous one's data ended.
      let nextTrunData: number | null = null;

      for (const trun of findAll(traf.children, 'trun')) {
        const trunVersion = dv.getUint8(trun.start + trun.hdr);
        const trunFlags = dv.getUint32(trun.start + trun.hdr) & 0xffffff;
        let o = trun.start + trun.hdr + 4;
        const count = dv.getUint32(o);
        o += 4;

        let dataPos: number;
        if (trunFlags & TRUN_DATA_OFFSET) {
          dataPos = dv.getInt32(o);
          o += 4;
        } else if (nextTrunData !== null) {
          dataPos = nextTrunData;
        } else {
          return [{ kind: 'unsupported', reason: 'first trun without data-offset' }];
        }

        let firstSampleFlags: number | undefined;
        if (trunFlags & TRUN_FIRST_SAMPLE_FLAGS) {
          firstSampleFlags = dv.getUint32(o);
          o += 4;
        }

        for (let i = 0; i < count; i++) {
          let duration = defaultDuration;
          let size = defaultSize;
          let flags = i === 0 && firstSampleFlags !== undefined ? firstSampleFlags : defaultFlags;
          let cts = 0;
          if (trunFlags & TRUN_SAMPLE_DURATION) { duration = dv.getUint32(o); o += 4; }
          if (trunFlags & TRUN_SAMPLE_SIZE) { size = dv.getUint32(o); o += 4; }
          if (trunFlags & TRUN_SAMPLE_FLAGS) {
            flags = dv.getUint32(o); o += 4;
            if (i === 0 && firstSampleFlags !== undefined) flags = firstSampleFlags;
          }
          if (trunFlags & TRUN_SAMPLE_CTS) {
            cts = trunVersion === 0 ? dv.getUint32(o) : dv.getInt32(o);
            o += 4;
          }

          if (duration === undefined || size === undefined) {
            return [{ kind: 'unsupported', reason: 'sample without duration/size (no trun field, no defaults)' }];
          }
          if (flags === undefined) {
            return [{ kind: 'unsupported', reason: 'sample without resolvable flags (keyframe unknown)' }];
          }
          if (dataPos < 0 || dataPos + size > segment.byteLength) {
            return [{ kind: 'unsupported', reason: 'sample byte range outside segment' }];
          }

          samples.push({
            dts,
            pts: dts + cts,
            duration,
            key: isKeySample(flags),
            bytes: segment.subarray(dataPos, dataPos + size),
          });
          dts += duration;
          dataPos += size;
        }

        nextTrunData = dataPos;
      }

      if (samples.length) {
        events.push({ kind: 'fragment', fragment: { seq, trackId, baseDts, samples } });
      }
    }

    return events;
  }
}
