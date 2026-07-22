// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { BackfillFetcher } from '../../../src/stepping/backfill-fetcher';
import type { MediaFetchSession } from '../../../src/core/media-fetch-session';
import { buildInit, buildGop } from './fmp4-fixtures';

// ─── Fixtures ───────────────────────────────────────────────────────────────
// Container structure rebuilt in-code from the spike's real sample tables (see
// fmp4-fixtures.ts). The helpers below re-stamp these bytes (tfdt/mfhd/avcC/
// trun) by fourcc, exactly as they did on the original captures.

const INIT = buildInit();
const GOP01 = buildGop();

/**
 * A second init whose avcC level byte is altered — a mid-session codec
 * change (different decoder configuration record, same box sizes so the
 * fixture still parses). The codec string the fetcher derives changes too.
 */
function initWithChangedConfig(): Uint8Array {
  const bytes = INIT.slice();
  const tag = [0x61, 0x76, 0x63, 0x43]; // 'avcC'
  let idx = -1;
  for (let i = 0; i + 4 <= bytes.length; i++) {
    if (bytes[i] === tag[0] && bytes[i + 1] === tag[1] && bytes[i + 2] === tag[2] && bytes[i + 3] === tag[3]) {
      idx = i;
      break;
    }
  }
  if (idx < 0) throw new Error('avcC not found in init fixture');
  // Record bytes follow the 4-byte fourcc: configVersion, profile, compat,
  // level — flip the level byte.
  const levelByteOffset = idx + 4 + 3;
  bytes[levelByteOffset] = bytes[levelByteOffset] ^ 0xff;
  return bytes;
}

function findFourcc(bytes: Uint8Array, tag: string): number {
  const codes = [...tag].map((c) => c.charCodeAt(0));
  for (let i = 0; i + 4 <= bytes.length; i++) {
    if (bytes[i] === codes[0] && bytes[i + 1] === codes[1]
      && bytes[i + 2] === codes[2] && bytes[i + 3] === codes[3]) {
      return i;
    }
  }
  throw new Error(`${tag} not found in fixture`);
}

/**
 * gop01 re-stamped at a different container time: tfdt baseMediaDecodeTime
 * and mfhd sequence patched in place, so the same real GOP can be delivered
 * a second time within ONE aim (one anchor) at a chosen tick offset.
 */
function gopAtBaseDts(baseDts: number, seq: number): Uint8Array {
  const bytes = GOP01.slice();
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tfdt = findFourcc(bytes, 'tfdt');
  if (dv.getUint8(tfdt + 4) === 1) {
    dv.setUint32(tfdt + 8, Math.floor(baseDts / 4294967296));
    dv.setUint32(tfdt + 12, baseDts >>> 0);
  } else {
    dv.setUint32(tfdt + 8, baseDts);
  }
  const mfhd = findFourcc(bytes, 'mfhd');
  dv.setUint32(mfhd + 8, seq);
  return bytes;
}

/**
 * Like {@link gopAtBaseDts} but with the first two unequal adjacent trun
 * sample sizes swapped (sum preserved, so the mdat still parses): the same
 * terrain shape carrying a size sequence that matches no stored window —
 * "foreign footage" to the stitch fingerprint, which identifies same-footage
 * re-delivery by its exact size sequence and would otherwise snap a
 * byte-identical re-delivery onto the stored grid.
 */
function foreignGopAtBaseDts(baseDts: number, seq: number): Uint8Array {
  const bytes = gopAtBaseDts(baseDts, seq);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const trun = findFourcc(bytes, 'trun');
  const flags = dv.getUint32(trun + 4) & 0xffffff;
  const count = dv.getUint32(trun + 8);
  if (!(flags & 0x200)) throw new Error('fixture trun has no per-sample sizes');
  let p = trun + 12;
  if (flags & 0x1) p += 4; // data-offset
  if (flags & 0x4) p += 4; // first-sample-flags
  const entry = (flags & 0x100 ? 4 : 0) + (flags & 0x200 ? 4 : 0)
    + (flags & 0x400 ? 4 : 0) + (flags & 0x800 ? 4 : 0);
  const sizeOffset = flags & 0x100 ? 4 : 0;
  for (let i = 0; i + 1 < count; i++) {
    const a = p + i * entry + sizeOffset;
    const b = p + (i + 1) * entry + sizeOffset;
    const sa = dv.getUint32(a);
    const sb = dv.getUint32(b);
    if (sa !== sb) {
      dv.setUint32(a, sb);
      dv.setUint32(b, sa);
      return bytes;
    }
  }
  throw new Error('fixture sizes are uniform — cannot derive a foreign sequence');
}

function u32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

/**
 * A synthetic 4-sample fragment carrying a composition-time offset on the
 * first (keyframe) sample, so `samples[0].pts = baseDts + cts0` (≠ baseDts).
 * The stepping fixtures are all cts=0 (kf-led, pts==dts), so this is the only
 * way to exercise the ledger's binding axis: anchor selection keys on
 * `baseDts` (the strictly-monotonic decode origin), never `samples[0].pts`
 * (which a composition offset — a B-frame — pushes forward off that axis).
 */
function bFrameGop(baseDts: number, seq: number, cts0: number): Uint8Array {
  const KEY = 0x2000000; // sample_depends_on=2 → sync sample (matches gop01)
  const NONKEY = 0x1010000;
  const sizes = [120, 40, 40, 40];
  const perSample: number[] = [];
  for (let i = 0; i < sizes.length; i++) {
    perSample.push(...u32(512), ...u32(sizes[i]), ...u32(i === 0 ? cts0 : 0));
  }
  const mfhd = rawBox('mfhd', u32(0), u32(seq));
  const tfhd = rawBox('tfhd', u32(0x20), u32(1), u32(NONKEY)); // trackId 1, default-flags
  const tfdt = rawBox('tfdt', u32(0), u32(baseDts));
  // trun flags: data-offset|first-sample-flags|duration|size|cts = 0xb05.
  const trun = rawBox('trun', u32(0xb05), u32(sizes.length), u32(0), u32(KEY), perSample);
  const moof = rawBox('moof', mfhd, rawBox('traf', tfhd, tfdt, trun));
  const mdat = rawBox('mdat', new Array(sizes.reduce((a, b) => a + b, 0)).fill(0));
  // default-base-is-moof: the first sample's data sits at the mdat payload,
  // i.e. moof.byteLength + the mdat box header (8).
  const trunOff = findFourcc(moof, 'trun');
  new DataView(moof.buffer, moof.byteOffset, moof.byteLength)
    .setInt32(trunOff + 12, moof.byteLength + 8);
  const out = new Uint8Array(moof.byteLength + mdat.byteLength);
  out.set(moof, 0);
  out.set(mdat, moof.byteLength);
  return out;
}

function rawBox(type: string, ...parts: (number[] | Uint8Array)[]): Uint8Array {
  const payload = parts.flatMap((p) => Array.from(p));
  const bytes = new Uint8Array(8 + payload.length);
  new DataView(bytes.buffer).setUint32(0, bytes.byteLength);
  bytes.set([...type].map((c) => c.charCodeAt(0)), 4);
  bytes.set(payload, 8);
  return bytes;
}

/**
 * A structurally-valid moof+mdat whose trun declares a sample count far
 * beyond the segment: per-sample cts reads march past the buffer end and
 * throw a RangeError mid-parse (the parser's field reads are not
 * bounds-checked end-to-end).
 */
function fragmentThatThrows(trackId: number): Uint8Array {
  const mfhd = rawBox('mfhd', u32(0), u32(99));
  // tfhd carries default duration/size/flags (0x38) so only the cts read runs.
  const tfhd = rawBox('tfhd', u32(0x38), u32(trackId), u32(512), u32(0), u32(0x10000));
  const tfdt = rawBox('tfdt', u32(0), u32(0));
  // trun: data-offset + per-sample cts (0x801), count ≫ segment bytes.
  const trun = rawBox('trun', u32(0x801), u32(1_000_000), u32(0));
  const moof = rawBox('moof', mfhd, rawBox('traf', tfhd, tfdt, trun));
  const mdat = rawBox('mdat', new Array(64).fill(0));
  const out = new Uint8Array(moof.byteLength + mdat.byteLength);
  out.set(moof, 0);
  out.set(mdat, moof.byteLength);
  return out;
}

/** gop01's container timeline facts (asserted in the parser suite). */
const GOP01_BASE_DTS = 0;

/** Epoch base for tests (archive position in ms). */
const T0 = 1_780_000_000_000;

// ─── Mock MediaFetchSession ─────────────────────────────────────────────────

class MockFetchSession {
  static instances: MockFetchSession[] = [];
  /** When true, connect() hangs until resolveConnect() is called. */
  static gateConnect = false;

  private emitter = new EventTarget();
  private connectGate: (() => void) | null = null;
  private connectReject: ((err: Error) => void) | null = null;
  state = 'connecting';
  disposed = false;
  mime = 'video/mp4; codecs="avc1.420032"';

  seek = vi.fn().mockReturnValue(true);
  pause = vi.fn().mockReturnValue(true);
  resume = vi.fn().mockReturnValue(true);
  dispose = vi.fn().mockImplementation(() => {
    this.disposed = true;
  });

  constructor(public readonly positionMs: number) {
    MockFetchSession.instances.push(this);
  }

  connect(): Promise<void> {
    if (MockFetchSession.gateConnect) {
      return new Promise((resolve, reject) => {
        this.connectGate = () => {
          this.state = 'connected';
          resolve();
        };
        this.connectReject = reject;
      });
    }
    this.state = 'connected';
    return Promise.resolve();
  }

  resolveConnect(): void {
    this.connectGate?.();
    this.connectGate = null;
    this.connectReject = null;
  }

  /** Reject the gated handshake (dispose-mid-connect abort). */
  rejectConnect(): void {
    this.connectReject?.(new Error('aborted'));
    this.connectGate = null;
    this.connectReject = null;
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

  // ── Test drivers ──────────────────────────────────────────────────────

  /** Deliver the init segment. */
  deliverInit(): void {
    this.emit('buffer', INIT.buffer.slice(INIT.byteOffset, INIT.byteOffset + INIT.byteLength));
  }

  /** Anchor pair mapping container tick `rtp` to epoch `ms`. */
  deliverAnchor(ms: number, rtp = GOP01_BASE_DTS): void {
    this.emit('timestamp', { timestampMs: ms, rtpTimestamp: rtp });
  }

  /** Deliver the real captured GOP (seq 1, baseDts 0, ~1 s of media). */
  deliverGop(): void {
    this.emit('buffer', GOP01.buffer.slice(GOP01.byteOffset, GOP01.byteOffset + GOP01.byteLength));
  }

  /** Deliver arbitrary bytes as one DC binary frame. */
  deliver(bytes: Uint8Array): void {
    this.emit('buffer', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }
}

function makeFetcher(overrides: Record<string, unknown> = {}) {
  MockFetchSession.instances = [];
  const fetcher = new BackfillFetcher({
    openSession: (positionMs: number) =>
      new MockFetchSession(positionMs) as unknown as MediaFetchSession,
    ...overrides,
  });
  const events: Record<string, unknown[]> = {
    ready: [], progress: [], windowcomplete: [], stalled: [],
    landingfailed: [], noearlierdata: [], conflictfailed: [], unsupported: [], sessionlost: [],
  };
  for (const name of Object.keys(events)) {
    fetcher.on(name as never, ((detail: unknown) => {
      events[name].push(detail);
    }) as never);
  }
  return { fetcher, events };
}

function lastSession(): MockFetchSession {
  const s = MockFetchSession.instances.at(-1);
  if (!s) throw new Error('no session created');
  return s;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('BackfillFetcher', () => {
  beforeEach(() => {
    MockFetchSession.instances = [];
    MockFetchSession.gateConnect = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens a session at window start, collects through parser into the store', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);

    const session = lastSession();
    expect(session.positionMs).toBe(T0 + 500 - 10_000);
    expect(fetcher.state).toBe('collecting');

    session.deliverInit();
    expect(events.ready).toHaveLength(1);
    expect(fetcher.store).not.toBeNull();
    expect(fetcher.init?.videoTrack?.timescale).toBe(15360);
    expect(fetcher.mime).toContain('avc1');

    session.deliverAnchor(T0);
    session.deliverGop();

    expect(events.progress).toEqual([{ addedSamples: 30 }]);
    expect(fetcher.store!.sampleCount).toBe(30);
    // toMs (T0+500) is inside the delivered GOP → window complete + paused.
    expect(events.windowcomplete).toHaveLength(1);
    expect(session.pause).toHaveBeenCalled();
    expect(fetcher.state).toBe('paused');
  });

  it('setWindowMs resizes the next aim window at runtime (windowMs getter reflects it)', async () => {
    const { fetcher } = makeFetcher();
    expect(fetcher.windowMs).toBe(10_000);

    fetcher.setWindowMs(20_000);
    expect(fetcher.windowMs).toBe(20_000);

    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    // The wider window positions the session 20 s (not the 10 s default)
    // before the ask — the aim read the resized window live.
    expect(session.positionMs).toBe(T0 + 500 - 20_000);
  });

  it('passes fetchSpeed to new sessions; a speed change stops live-session reuse until it matches again', async () => {
    const speeds: (number | undefined)[] = [];
    const { fetcher } = makeFetcher({
      openSession: (positionMs: number, speed?: number) => {
        speeds.push(speed);
        return new MockFetchSession(positionMs) as unknown as MediaFetchSession;
      },
    });
    expect(fetcher.fetchSpeed).toBeUndefined();

    await fetcher.openWindow(T0 + 500);
    // Same requested speed → the live session is reused via DC seek.
    await fetcher.openWindow(T0 + 400);
    expect(MockFetchSession.instances).toHaveLength(1);

    // Speed is baked at handshake: a change makes the next aim reconnect.
    fetcher.setFetchSpeed(4);
    expect(fetcher.fetchSpeed).toBe(4);
    await fetcher.openWindow(T0 + 300);
    expect(MockFetchSession.instances).toHaveLength(2);

    // Matching speed again → reuse resumes.
    await fetcher.openWindow(T0 + 200);
    expect(MockFetchSession.instances).toHaveLength(2);

    // Restoring the factory default forces one more reconnect.
    fetcher.setFetchSpeed(undefined);
    await fetcher.openWindow(T0 + 100);
    expect(MockFetchSession.instances).toHaveLength(3);
    expect(speeds).toEqual([undefined, 4, undefined]);
  });

  it('openAtAnchor positions the session at the anchor and completes on the governing GOP', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openAtAnchor(T0 + 500);

    const session = lastSession();
    // Positioned AT the anchor — not a full window before it (cf. openWindow).
    expect(session.positionMs).toBe(T0 + 500);
    expect(fetcher.state).toBe('collecting');

    session.deliverInit();
    expect(events.ready).toHaveLength(1);
    // The governing keyframe lands ~500 ms before the ask; its GOP covers it.
    session.deliverAnchor(T0);
    session.deliverGop();

    expect(events.windowcomplete).toHaveLength(1);
    expect(session.pause).toHaveBeenCalled();
    expect(fetcher.state).toBe('paused');
  });

  it('openAtAnchor reuses a live session with a paused seek (no resume, no new session)', async () => {
    const { fetcher } = makeFetcher();
    // Establish and complete a first window so the session is live + paused.
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');
    session.resume.mockClear();
    session.seek.mockClear();

    await fetcher.openAtAnchor(T0 - 3_000);

    expect(MockFetchSession.instances).toHaveLength(1); // reused
    expect(session.seek).toHaveBeenCalledWith(T0 - 3_000);
    expect(session.resume).not.toHaveBeenCalled(); // paused seek → governing GOP only
    expect(fetcher.state).toBe('collecting');

    session.deliverAnchor(T0 - 3_400);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');
  });

  it('openAtAnchor halts an in-flight forward fill before the entry seek', async () => {
    const { fetcher } = makeFetcher();
    // A window that ends well past the delivered GOP keeps the session
    // collecting (forward fill still in flight, never completed).
    await fetcher.openWindow(T0 + 5_000);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop(); // covers ~[T0, T0+1s] — short of toMs, still collecting
    expect(fetcher.state).toBe('collecting');
    session.pause.mockClear();
    session.seek.mockClear();

    await fetcher.openAtAnchor(T0 - 3_000);

    // The mis-aimed forward delivery is paused before re-seeking to the anchor.
    expect(session.pause).toHaveBeenCalledTimes(1);
    expect(session.seek).toHaveBeenCalledWith(T0 - 3_000);
    expect(session.resume).not.toHaveBeenCalled();
    expect(fetcher.state).toBe('collecting');
  });

  it('handles fragment-before-anchor delivery order', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();

    session.deliverInit();
    session.deliverGop(); // fragment first — must buffer, not drop
    expect(fetcher.store!.sampleCount).toBe(0);

    session.deliverAnchor(T0);
    expect(fetcher.store!.sampleCount).toBe(30);
    expect(events.windowcomplete).toHaveLength(1);
  });

  it('drops fragments from a superseded generation (anchor mis-binding guard)', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    session.deliverGop(); // fragment with no anchor yet
    fetcher.refetchHole(T0 - 5_000); // owner re-aims — new generation
    // The stale fragment must not bind to the new aim's anchor.
    session.deliverAnchor(T0 - 5_000);
    expect(fetcher.store!.sampleCount).toBe(0);
  });

  it('re-seeks once on a landing miss, then abandons the window', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    // Anchor places delivery 2 hours away from the ask — a spray.
    session.deliverAnchor(T0 + 7_200_000);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(0);
    expect(events.landingfailed).toHaveLength(0);
    // The mis-positioned stream is halted while the re-seek waits.
    expect(session.pause).toHaveBeenCalledTimes(1);

    // The server keeps streaming the wrong window until the pause lands —
    // those fragments must NOT count as a second landing verdict.
    session.deliverGop();
    session.deliverGop();
    expect(events.landingfailed).toHaveLength(0);
    expect(fetcher.store!.sampleCount).toBe(0);

    // Bounded re-seek fires after the delay, resuming delivery.
    await vi.advanceTimersByTimeAsync(1_300);
    expect(session.seek).toHaveBeenCalledWith(T0 + 500 - 10_000);
    expect(session.resume).toHaveBeenCalled();

    // The re-seeked aim mis-lands somewhere ELSE (a true spray) →
    // abandoned, exactly one event.
    session.deliverAnchor(T0 + 3_600_000);
    session.deliverGop();
    expect(events.landingfailed).toHaveLength(1);
    expect(events.noearlierdata).toHaveLength(0);
    expect(fetcher.state).toBe('paused');
    expect(fetcher.store!.sampleCount).toBe(0);
  });

  it('a re-seek that lands at the same forward position twice emits noearlierdata, not landingfailed', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    // The degraded server lands ~6 s forward of the ask…
    session.deliverAnchor(T0 + 6_000);
    session.deliverGop();
    expect(events.landingfailed).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1_300); // bounded re-seek fires

    // …and again at (nearly) the same spot, drifted by ~1× across the
    // re-seek delay — its deterministic answer, not a spray.
    session.deliverAnchor(T0 + 7_000);
    session.deliverGop();
    expect(events.noearlierdata).toHaveLength(1);
    expect(events.landingfailed).toHaveLength(0);
    expect(fetcher.state).toBe('paused');
    expect(fetcher.store!.sampleCount).toBe(0);
  });

  it('a re-seek that lands at the same early position twice is accepted as a coverage island', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    // Across a >20 s recording gap the server can only deliver the
    // previous chunk's last GOP — correctly anchored, just early.
    session.deliverAnchor(T0 - 40_000);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(0); // first verdict: re-seek

    await vi.advanceTimersByTimeAsync(1_300);

    // Same mapping as the abandoned aim: the first arrival is
    // residue-suspect; the periodic ~1/s re-emission confirms it as the aim's own.
    session.deliverAnchor(T0 - 40_000);
    session.deliverAnchor(T0 - 40_000);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(30);
    expect(events.progress).toHaveLength(1);
    expect(events.landingfailed).toHaveLength(0);
    expect(events.noearlierdata).toHaveLength(0);
  });

  it('vetoes a stable early landing when the chunk oracle says the archive is continuous there', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    // The client knows recording is continuous across the landing AND the ask:
    // a stable early landing here can only be server mis-positioning.
    fetcher.setRecordedSpans([{ startMs: T0 - 100_000, endMs: T0 + 100_000 }]);
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    session.deliverAnchor(T0 - 40_000);
    session.deliverGop();
    await vi.advanceTimersByTimeAsync(1_300);
    session.deliverAnchor(T0 - 40_000);
    session.deliverAnchor(T0 - 40_000);
    session.deliverGop();

    expect(events.landingfailed).toHaveLength(1);
    expect(fetcher.store!.sampleCount).toBe(0); // no phantom island admitted
    expect(fetcher.state).toBe('paused');
  });

  it('vetoes a stable early landing in an OLDER span when the ask itself is recorded (cross-span spray)', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    // The ask (window start T0-9.5s) is inside the second recorded span — the
    // server had the data; landing in the older span is mis-positioning.
    fetcher.setRecordedSpans([
      { startMs: T0 - 100_000, endMs: T0 - 35_000 },
      { startMs: T0 - 20_000, endMs: T0 + 100_000 },
    ]);
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    session.deliverAnchor(T0 - 40_000);
    session.deliverGop();
    await vi.advanceTimersByTimeAsync(1_300);
    session.deliverAnchor(T0 - 40_000);
    session.deliverAnchor(T0 - 40_000);
    session.deliverGop();

    expect(events.landingfailed).toHaveLength(1);
    expect(fetcher.store!.sampleCount).toBe(0);
  });

  it('still accepts a stable early landing across a genuine recording gap when spans are known', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    // A real gap separates the landing (previous chunk) from the ask.
    fetcher.setRecordedSpans([
      { startMs: T0 - 100_000, endMs: T0 - 35_000 },
      { startMs: T0 - 8_000, endMs: T0 + 100_000 },
    ]);
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    session.deliverAnchor(T0 - 40_000);
    session.deliverGop();
    await vi.advanceTimersByTimeAsync(1_300);
    session.deliverAnchor(T0 - 40_000);
    session.deliverAnchor(T0 - 40_000);
    session.deliverGop();

    expect(events.landingfailed).toHaveLength(0);
    expect(fetcher.store!.sampleCount).toBe(30); // legitimate cross-gap island
  });

  it('a re-seeked aim that lands correctly recovers the window', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    session.deliverAnchor(T0 + 7_200_000); // spray
    session.deliverGop();
    await vi.advanceTimersByTimeAsync(1_300); // re-seek fires

    session.deliverAnchor(T0); // correct landing this time
    session.deliverGop();

    expect(events.landingfailed).toHaveLength(0);
    expect(fetcher.store!.sampleCount).toBe(30);
    expect(events.windowcomplete).toHaveLength(1);
  });

  it('a re-aim cancels the scheduled re-seek (no stray seek later)', async () => {
    vi.useFakeTimers();
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    session.deliverAnchor(T0 + 7_200_000); // miss → re-seek scheduled
    session.deliverGop();
    // The owner re-aims before the timer fires.
    fetcher.refetchHole(T0 - 3_000);
    session.seek.mockClear();

    await vi.advanceTimersByTimeAsync(2_000);
    // The stale re-seek to the OLD window never fires.
    expect(session.seek).not.toHaveBeenCalledWith(T0 + 500 - 10_000);
  });

  it('holeRefetch landing verification targets the ask, not the window start', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();

    fetcher.refetchHole(T0 - 3_000);
    session.seek.mockClear();
    // Governing GOP lands ~400 ms before the ask — must pass.
    session.deliverAnchor(T0 - 3_400);
    session.deliverGop();
    expect(events.landingfailed).toHaveLength(0);

    // A second hole refetch that sprays must re-seek toward the ASK (toMs).
    fetcher.refetchHole(T0 - 6_000);
    session.deliverAnchor(T0 + 3_600_000);
    session.deliverGop();
    await vi.advanceTimersByTimeAsync(1_300);
    expect(session.seek).toHaveBeenCalledWith(T0 - 6_000);
  });

  it('pauseDelivery during a hung connect drops the session once it resolves', async () => {
    MockFetchSession.gateConnect = true;
    const { fetcher } = makeFetcher();
    const opening = fetcher.openWindow(T0 + 500);
    const session = lastSession();
    expect(fetcher.state).toBe('opening');

    // The owner exits while the handshake is in flight.
    fetcher.pauseDelivery();
    expect(fetcher.state).toBe('paused');

    session.resolveConnect();
    await opening;

    // The exited-from session is dropped, not silently resumed.
    expect(session.dispose).toHaveBeenCalled();
    expect(fetcher.state).toBe('paused');
  });

  it('dispose during a hung connect leaves no collecting state behind', async () => {
    MockFetchSession.gateConnect = true;
    const { fetcher, events } = makeFetcher();
    const opening = fetcher.openWindow(T0 + 500);
    const session = lastSession();

    fetcher.dispose();
    session.resolveConnect();
    await opening;

    expect(session.dispose).toHaveBeenCalled();
    expect(events.stalled).toHaveLength(0);
    expect(fetcher.state).not.toBe('collecting');
  });

  it('a superseding aim during a cold connect must not tear down the replacement session', async () => {
    MockFetchSession.gateConnect = true;
    const { fetcher, events } = makeFetcher();
    const first = fetcher.openAtAnchor(T0);
    const sessionA = MockFetchSession.instances[0];
    expect(fetcher.state).toBe('opening');

    // A re-anchor supersedes the in-flight entry connect with a new aim.
    const second = fetcher.openAtAnchor(T0 + 5_000);
    const sessionB = MockFetchSession.instances[1];
    expect(sessionA.dispose).toHaveBeenCalled();

    // The superseded handshake rejects (disposed mid-connect). The failure
    // belongs to the dead session: the replacement must survive, no
    // terminal 'failed', no sessionlost.
    sessionA.rejectConnect();
    await first;
    expect(sessionB.dispose).not.toHaveBeenCalled();
    expect(events.sessionlost).toHaveLength(0);
    expect(fetcher.state).toBe('opening');

    // The replacement aim proceeds end-to-end.
    sessionB.resolveConnect();
    await second;
    expect(fetcher.state).toBe('collecting');
    sessionB.deliverInit();
    expect(events.ready).toHaveLength(1);
  });

  it('a superseded connect that resolves late must not corrupt the replacement aim', async () => {
    MockFetchSession.gateConnect = true;
    const { fetcher, events } = makeFetcher();
    const first = fetcher.openAtAnchor(T0);
    const sessionA = MockFetchSession.instances[0];
    const second = fetcher.openAtAnchor(T0 + 5_000);
    const sessionB = MockFetchSession.instances[1];

    // The dead session's handshake resolves anyway (dispose raced it).
    sessionA.resolveConnect();
    await first;

    // The replacement is still opening — its lifecycle must be untouched.
    expect(fetcher.state).toBe('opening');
    expect(sessionB.dispose).not.toHaveBeenCalled();

    sessionB.resolveConnect();
    await second;
    expect(fetcher.state).toBe('collecting');
    expect(events.sessionlost).toHaveLength(0);
  });

  it('resets the parser before re-aim seeks (stale partial box never poisons)', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();

    // A partial moof arrives, then the previous aim is abandoned mid-box.
    const partial = GOP01.slice(0, 1_000);
    session.emit('buffer', partial.buffer.slice(partial.byteOffset, partial.byteOffset + partial.byteLength));

    fetcher.refetchHole(T0 - 3_000);
    session.deliverAnchor(T0 - 3_400);
    session.deliverGop();

    // The fresh delivery parsed cleanly from its first byte.
    expect(events.unsupported).toHaveLength(0);
    expect(fetcher.store!.sampleCount).toBe(60);
  });

  it('passes the store byte cap through to eviction', async () => {
    const { fetcher } = makeFetcher({ storeByteCap: 1_000_000 });
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop(); // ~830 KB of samples

    fetcher.store!.evictToCap(fetcher.store!.epochMsToTicks(T0));
    expect(fetcher.store!.byteLength).toBeLessThanOrEqual(1_000_000);
  });

  it('extendBack re-aims the live session with overlap, no new session', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    await fetcher.extendBack();

    expect(MockFetchSession.instances).toHaveLength(1); // reused
    // New window ends at oldest covered (T0) + 1 s overlap.
    expect(session.seek).toHaveBeenCalledWith(T0 + 1_000 - 10_000);
    expect(session.resume).toHaveBeenCalled();
    expect(fetcher.state).toBe('collecting');

    // The extension window lands 9 s earlier on the archive axis; the
    // same container bytes re-anchored place there.
    session.deliverAnchor(T0 - 9_000);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(60);
    expect(fetcher.store!.coverage()).toHaveLength(2); // 1 s gap between windows is real here
  });

  it('extendBack does not complete against pre-existing coverage before backward fill lands (M1)', async () => {
    const { fetcher, events } = makeFetcher({ windowMs: 2_000 });
    // Entry: governing GOP covers the anchor → coverage [T0, T0+1s), paused.
    await fetcher.openAtAnchor(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(events.windowcomplete).toHaveLength(1);
    expect(fetcher.state).toBe('paused');
    session.pause.mockClear();

    // extendBack aims [T0-1000 .. T0+1000]: toMs sits INSIDE existing
    // coverage by construction (oldest + overlap).
    await fetcher.extendBack();
    expect(fetcher.state).toBe('collecting');

    // The server re-anchors immediately; backward fill is still in flight.
    // The bare anchor must NOT complete the window — completing here pauses
    // the session before a single backward sample lands.
    session.deliverAnchor(T0 - 1_000);
    expect(events.windowcomplete).toHaveLength(1);
    expect(session.pause).not.toHaveBeenCalled();
    expect(fetcher.state).toBe('collecting');

    // Backward fill lands and stitches [T0-1000, T0) onto [T0, T0+1000):
    // the whole window is one merged interval → NOW complete.
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(60);
    expect(events.windowcomplete).toHaveLength(2);
    expect(session.pause).toHaveBeenCalled();
    expect(fetcher.state).toBe('paused');
  });

  it('an extendBack aim with nothing older completes once its delivery passes toMs (archive wall)', async () => {
    const { fetcher, events } = makeFetcher({ windowMs: 2_000 });
    await fetcher.openAtAnchor(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    await fetcher.extendBack();
    expect(fetcher.state).toBe('collecting');

    // Nothing recorded before T0: the server lands AT the archive start and
    // re-delivers the same GOP (all dupes, zero new samples). Delivery has
    // passed toMs (T0+1000), so the aim is honestly done — windowcomplete
    // with zero growth, not an eternal collect. The landing carries the old
    // aim's exact mapping, so the residue barrier holds the first anchor; the
    // periodic re-emission confirms it.
    session.deliverAnchor(T0);
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(30); // dupes only
    expect(events.windowcomplete).toHaveLength(2);
    expect(fetcher.state).toBe('paused');
  });

  it('extendBack hops to the previous chunk tail when the default ask falls in a recording gap', async () => {
    const { fetcher } = makeFetcher();
    // Previous chunk ends 35 s back; the current chunk starts 2 s back. The
    // default extend ask (oldest + overlap - window = T0-9s) falls in the gap.
    fetcher.setRecordedSpans([
      { startMs: T0 - 100_000, endMs: T0 - 35_000 },
      { startMs: T0 - 2_000, endMs: T0 + 100_000 },
    ]);
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    await fetcher.extendBack();

    // Aim re-targeted at the previous span's tail (inset 1 s), not the gap.
    expect(session.seek).toHaveBeenCalledWith(T0 - 36_000 - 10_000);
    expect(fetcher.state).toBe('collecting');
  });

  it('a hopped aim completes once the previous chunk tail is delivered', async () => {
    const { fetcher, events } = makeFetcher();
    fetcher.setRecordedSpans([
      { startMs: T0 - 100_000, endMs: T0 - 35_000 },
      { startMs: T0 - 2_000, endMs: T0 + 100_000 },
    ]);
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(events.windowcomplete).toHaveLength(1);

    await fetcher.extendBack();

    // The server lands inside the previous chunk's tail; ~1 s of delivery
    // passes the hopped toMs (T0-36s) → the aim completes on its own delivery.
    session.deliverAnchor(T0 - 36_500);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(60);
    expect(fetcher.store!.coverage()).toHaveLength(2); // detached cross-gap island
    expect(events.windowcomplete).toHaveLength(2);
    expect(fetcher.state).toBe('paused');
  });

  it('extendBack does not hop when the default ask is inside recorded archive', async () => {
    const { fetcher } = makeFetcher();
    fetcher.setRecordedSpans([{ startMs: T0 - 100_000, endMs: T0 + 100_000 }]);
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();

    await fetcher.extendBack();

    expect(session.seek).toHaveBeenCalledWith(T0 + 1_000 - 10_000);
  });

  it('extendBack does not hop when spans are unknown', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();

    await fetcher.extendBack();

    expect(session.seek).toHaveBeenCalledWith(T0 + 1_000 - 10_000);
  });

  it('extendBack does not hop when no recorded span exists below the ask (genuine archive start)', async () => {
    const { fetcher } = makeFetcher();
    fetcher.setRecordedSpans([{ startMs: T0 - 2_000, endMs: T0 + 100_000 }]);
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();

    await fetcher.extendBack();

    expect(session.seek).toHaveBeenCalledWith(T0 + 1_000 - 10_000);
  });

  it('hasRecordedDataBefore reports the chunk-oracle verdict', () => {
    const { fetcher } = makeFetcher();
    expect(fetcher.hasRecordedDataBefore(T0)).toBeNull();
    fetcher.setRecordedSpans([{ startMs: T0 - 10_000, endMs: T0 }]);
    expect(fetcher.hasRecordedDataBefore(T0 - 5_000)).toBe(true);
    expect(fetcher.hasRecordedDataBefore(T0 - 9_500)).toBe(false);
    fetcher.setRecordedSpans(null);
    expect(fetcher.hasRecordedDataBefore(T0)).toBeNull();
  });

  it('refetchHole seeks while paused without resuming', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    session.resume.mockClear();
    session.seek.mockClear();

    expect(fetcher.refetchHole(T0 - 3_000)).toBe(true);
    expect(session.seek).toHaveBeenCalledWith(T0 - 3_000);
    expect(session.resume).not.toHaveBeenCalled();
    expect(fetcher.state).toBe('collecting');

    // The governing GOP arrives (same bytes, re-anchored to cover the ask).
    session.deliverAnchor(T0 - 3_500);
    session.deliverGop();
    expect(events.windowcomplete).toHaveLength(2);
    expect(fetcher.state).toBe('paused');
  });

  it('reports stalls at watchdog cadence while collecting', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher({ stallTimeoutMs: 1_000 });
    await fetcher.openWindow(T0 + 500);

    await vi.advanceTimersByTimeAsync(1_100);
    expect(events.stalled).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_100);
    expect(events.stalled).toHaveLength(2);

    lastSession().deliverInit(); // delivery clears the stall cadence
    await vi.advanceTimersByTimeAsync(500);
    expect(events.stalled).toHaveLength(2);
  });

  it('continues across a mid-session codec change, tagging a new config epoch', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(30);
    const epoch0Codec = fetcher.store!.gopFor(fetcher.store!.epochMsToTicks(T0))!.config.codec;

    // The operator switched the camera's codec mid-recording: a new init
    // segment with a different avcC. Stepping must not disable.
    const changed = initWithChangedConfig();
    session.emit('buffer', changed.buffer.slice(changed.byteOffset, changed.byteOffset + changed.byteLength));
    expect(events.unsupported).toHaveLength(0);
    expect(events.ready).toHaveLength(1); // not re-emitted

    session.deliverAnchor(T0 - 9_000);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(60);

    const epoch1Codec = fetcher.store!.gopFor(fetcher.store!.epochMsToTicks(T0 - 9_000))!.config.codec;
    expect(epoch1Codec).not.toBe(epoch0Codec); // derived from the new avcC
    // The original window still resolves to its own (unchanged) config.
    expect(fetcher.store!.gopFor(fetcher.store!.epochMsToTicks(T0))!.config.codec).toBe(epoch0Codec);
  });

  it('treats a byte-identical mid-session init as a no-op (server re-send on seek)', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    const codecBefore = fetcher.store!.gopFor(fetcher.store!.epochMsToTicks(T0))!.config.codec;

    // The same init bytes again — not a codec change.
    session.deliverInit();
    expect(events.unsupported).toHaveLength(0);
    expect(events.ready).toHaveLength(1);

    session.deliverAnchor(T0 - 9_000);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(60);
    // Same epoch throughout: re-sent init never forks the config.
    expect(fetcher.store!.gopFor(fetcher.store!.epochMsToTicks(T0 - 9_000))!.config.codec).toBe(codecBefore);
  });

  it('fails terminally on a parser envelope violation', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    // size=0 box → unsupported.
    const bad = new Uint8Array(16);
    bad.set([0, 0, 0, 0, 0x6d, 0x6f, 0x6f, 0x66], 0);
    session.emit('buffer', bad.buffer);

    expect(events.unsupported).toEqual(['box with size=0 in live stream']);
    expect(fetcher.state).toBe('failed');
    await expect(fetcher.openWindow(T0)).rejects.toThrow('failed');
  });

  it('surfaces session loss, drops to idle, and the owner\'s next aim builds a fresh session', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();

    session.emit('error', 'lostConnection');

    expect(events.sessionlost).toHaveLength(1);
    // Recoverable, unlike a terminal parser failure: the owner-driven
    // reopen (the stepper's bounded rebuild) must not be refused.
    expect(fetcher.state).toBe('idle');
    expect(session.dispose).toHaveBeenCalled();

    await fetcher.openAtAnchor(T0 + 500);
    expect(MockFetchSession.instances).toHaveLength(2);
    expect(fetcher.state).toBe('collecting');
  });

  it('hole probes use a short stall watchdog; entry and window aims keep the configured timeout', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();

    // A full-window stall reports at the default 10 s cadence, not 2 s.
    await vi.advanceTimersByTimeAsync(2_500);
    expect(events.stalled).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(events.stalled).toHaveLength(1);

    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    // A gap probe that goes silent verdicts in ~2 s, not 10 — the empty
    // gap must not charge every first crossing the full timeout.
    fetcher.refetchHole(T0 - 3_000);
    await vi.advanceTimersByTimeAsync(2_100);
    expect(events.stalled).toHaveLength(2);

    // The entry aim is server-paced (3–5 s GOPs live) — never on the
    // probe watchdog.
    await fetcher.openAtAnchor(T0 - 5_000);
    await vi.advanceTimersByTimeAsync(2_100);
    expect(events.stalled).toHaveLength(2);
  });

  it('dispose tears the session down', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();

    fetcher.dispose();
    expect(session.dispose).toHaveBeenCalled();
  });

  it('a warm re-aim ignores an in-flight anchor carrying the previous aim\'s mapping (P0.10)', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    await fetcher.extendBack();
    // Residue of the old aim's periodic anchors arrives first…
    session.deliverAnchor(T0);
    // …then the new aim's first fragment, then its real anchor.
    session.deliver(gopAtBaseDts(30 * 512, 2));
    session.deliverAnchor(T0 - 9_000, 30 * 512);

    // The fragment binds to the NEW mapping: a coverage island ~9 s back,
    // never a mis-anchored continuation of the old window.
    expect(fetcher.store!.sampleCount).toBe(60);
    const coverage = fetcher.store!.coverage();
    expect(coverage).toHaveLength(2);
    expect(Math.abs(coverage[0].startTicks - fetcher.store!.epochMsToTicks(T0 - 9_000)))
      .toBeLessThan(20);
  });

  it('re-binds the previous aim\'s in-flight fragments to their own retained mapping (P0.15, was P0.10 drop)', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    await fetcher.extendBack();
    // Old-aim media still in flight when the re-aim lands: its container
    // ticks continue the old delivery, BELOW where the new aim starts…
    session.deliver(gopAtBaseDts(30 * 512, 2));
    // …then the seek echo: the governing keyframe the server will deliver
    // first, minted at a strictly higher container tick (muxer monotonic).
    session.deliverAnchor(T0 - 9_000, 60 * 512);
    session.deliver(gopAtBaseDts(60 * 512, 3));

    // The residue must never bind to the new anchor — it would land on
    // uncovered terrain a seek-distance off and poison it so every honest
    // re-delivery conflicts. But dropping it bites its terrain out of the
    // store (the ~420 ms GOP-tail seam bite): its correct placement is the
    // previous aim's retained mapping — re-bound there it extends the old
    // coverage exactly.
    expect(fetcher.preAimRebinds).toBe(1);
    expect(fetcher.preAimDrops).toBe(0);
    expect(fetcher.stitchConflicts).toBe(0);
    expect(fetcher.store!.sampleCount).toBe(90);
    expect(events.progress.length).toBeGreaterThanOrEqual(3);
    const coverage = fetcher.store!.coverage();
    expect(coverage).toHaveLength(2);
    expect(Math.abs(coverage[0].startTicks - fetcher.store!.epochMsToTicks(T0 - 9_000)))
      .toBeLessThan(20);
    expect(Math.abs(coverage[1].endTicks - fetcher.store!.epochMsToTicks(T0 + 2_000)))
      .toBeLessThan(20);
  });

  it('drops in-flight residue of an aim whose landing was never verified (spray never re-binds)', async () => {
    vi.useFakeTimers();
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    // Aim 1 mis-lands 2 h forward (spray) → re-seek scheduled; its landing is
    // never verified, but its anchor stays on the ledger.
    session.deliverAnchor(T0 + 7_200_000);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(0);

    await vi.advanceTimersByTimeAsync(1_300); // re-seek fires → new generation

    // Old-aim media still in flight, then the re-seeked aim's echo + delivery.
    session.deliver(gopAtBaseDts(30 * 512, 2));
    session.deliverAnchor(T0 - 9_500, 60 * 512);
    session.deliver(gopAtBaseDts(60 * 512, 3));

    // The residue would place a phantom island 2 h up (the spray mapping) —
    // it must DROP, not re-bind; only the verified aim's delivery lands.
    expect(fetcher.preAimRebinds).toBe(0);
    expect(fetcher.preAimDrops).toBeGreaterThanOrEqual(1);
    expect(fetcher.store!.sampleCount).toBe(30);
    const coverage = fetcher.store!.coverage();
    expect(coverage).toHaveLength(1);
    expect(Math.abs(coverage[0].startTicks - fetcher.store!.epochMsToTicks(T0 - 9_500)))
      .toBeLessThan(20);
  });

  it('binds a pre-init seek echo at store creation — the aim\'s own first GOP never drops as pre-aim (P0.15)', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    // Cold-entry live order: the true echo arrives BEFORE the init, then a
    // ~1 s periodic re-emission referencing the SECOND GOP, then media.
    // Without binding the pre-store echo, the periodic anchor masquerades
    // as the echo and the aim's own first GOP drops as residue.
    session.deliverAnchor(T0, 0);
    session.deliverInit();
    session.deliverAnchor(T0 + 1_000, 30 * 512);
    session.deliverGop();

    expect(fetcher.preAimDrops).toBe(0);
    expect(fetcher.preAimRebinds).toBe(0);
    expect(fetcher.store!.sampleCount).toBe(30);
    const coverage = fetcher.store!.coverage();
    expect(coverage).toHaveLength(1);
    expect(Math.abs(coverage[0].startTicks - fetcher.store!.epochMsToTicks(T0)))
      .toBeLessThan(20);
  });

  it('the aim\'s own first GOP binds to its echo, never dropped as residue (P0.15/#95)', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    await fetcher.extendBack();
    // The true seek echo anchors the governing keyframe the server delivers
    // first (spike: rtp ticks at the mp4 timescale), so its rtp IS the GOP's
    // decode origin. The ledger binds the GOP's baseDts to this echo (latest
    // anchor at-or-below it), placing it at the landing as a fresh island,
    // never mistaken for residue of the previous mapping.
    session.deliverAnchor(T0 - 9_000, 30 * 512);
    session.deliver(gopAtBaseDts(30 * 512, 2));

    expect(fetcher.preAimRebinds).toBe(0);
    expect(fetcher.preAimDrops).toBe(0);
    expect(fetcher.stitchConflicts).toBe(0);
    expect(fetcher.store!.sampleCount).toBe(60);
    const coverage = fetcher.store!.coverage();
    expect(coverage).toHaveLength(2);
    expect(Math.abs(coverage[0].startTicks - fetcher.store!.epochMsToTicks(T0 - 9_000)))
      .toBeLessThan(20);
  });

  it('an in-flight fragment older than the previous aim\'s mapping drops — attribution has a floor (P0.15)', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    // The first aim's own delivery starts at tick 10·512 — its floor.
    session.deliverAnchor(T0, 10 * 512);
    session.deliver(gopAtBaseDts(10 * 512, 1));
    expect(fetcher.state).toBe('paused');

    await fetcher.extendBack();
    // In-flight media from below the previous aim's floor (two aims old —
    // a rapid double re-aim): the retained mapping cannot vouch for it.
    session.deliverAnchor(T0 - 9_000, 60 * 512);
    session.deliver(gopAtBaseDts(0, 2));
    session.deliver(gopAtBaseDts(60 * 512, 3));

    expect(fetcher.preAimDrops).toBe(1);
    expect(fetcher.preAimRebinds).toBe(0);
    expect(fetcher.store!.sampleCount).toBe(60);
  });

  // ── Per-session anchor ledger ────────────────────────────────────────────

  it('binds a kf-led residue straddling the echo to the OLD mapping — the #94 blind spot, fixed (#95)', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    await fetcher.extendBack();
    // A keyframe-led flushed partial from the old aim, still in flight: its
    // container ticks continue the old delivery (baseDts 30·512), and its
    // body extends PAST where the new echo lands (45·512, inside the GOP's
    // tick span). A head-AND-tail floor test would see the body cross the
    // floor and bind it to the current mapping — a seek-distance off. The
    // ledger instead binds the fragment's decode origin to the latest anchor
    // at-or-below it (the previous aim's), so it lands contiguous with the
    // old coverage, no orphan island.
    session.deliver(gopAtBaseDts(30 * 512, 2));
    session.deliverAnchor(T0 - 9_000, 45 * 512);

    expect(fetcher.preAimRebinds).toBe(1);
    expect(fetcher.preAimDrops).toBe(0);
    expect(fetcher.stitchConflicts).toBe(0);
    expect(fetcher.store!.sampleCount).toBe(60);
    const coverage = fetcher.store!.coverage();
    expect(coverage).toHaveLength(1);
    expect(Math.abs(coverage[0].startTicks - fetcher.store!.epochMsToTicks(T0)))
      .toBeLessThan(20);
    expect(Math.abs(coverage[0].endTicks - fetcher.store!.epochMsToTicks(T0 + 2_000)))
      .toBeLessThan(20);
  });

  it('binds each fragment to its rtp-governing anchor, not the latest arrived (within-aim, #95)', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 - 4_000);
    const session = lastSession();
    session.deliverInit();
    // One aim, two anchors across a skipped recording gap (the muxer
    // re-anchors over the gap; container ticks stay monotonic). BOTH anchors
    // arrive before either fragment — arrival-order binding would put both
    // under the latest anchor. The ledger binds each by its own decode origin.
    session.deliverAnchor(T0 - 9_000, 0);
    session.deliverAnchor(T0 - 4_000, 90 * 512);
    session.deliver(gopAtBaseDts(0, 1));
    session.deliver(gopAtBaseDts(90 * 512, 2));

    expect(fetcher.store!.sampleCount).toBe(60);
    const coverage = fetcher.store!.coverage();
    expect(coverage).toHaveLength(2);
    // frag1 (baseDts 0) → anchor#1 at T0-9000; frag2 (baseDts 90·512) →
    // anchor#2 at T0-4000. Arrival-latest binding would have put frag1 at
    // T0-7000 (under anchor#2).
    expect(Math.abs(coverage[0].startTicks - fetcher.store!.epochMsToTicks(T0 - 9_000)))
      .toBeLessThan(20);
    expect(Math.abs(coverage[1].startTicks - fetcher.store!.epochMsToTicks(T0 - 4_000)))
      .toBeLessThan(20);
  });

  it('a container-timeline rtp regression fails honest, never a silent mis-bind (#95)', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0, 30 * 512);
    session.deliver(gopAtBaseDts(30 * 512, 1));
    expect(fetcher.state).toBe('paused');

    await fetcher.extendBack();
    // A fresh anchor whose rtp is far below the ledger high-water mark: the
    // container timeline never re-bases within a session, so this is
    // unmappable — fail honest rather than place data on a phantom axis.
    session.deliverAnchor(T0 - 20_000, 5 * 512);

    expect(events.unsupported).toHaveLength(1);
    expect(events.unsupported[0]).toBe('container timeline rebase');
    expect(fetcher.state).toBe('failed');
  });

  it('selects the anchor by baseDts, not the first sample\'s pts (B-frame composition offset, #95)', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 - 4_000);
    const session = lastSession();
    session.deliverInit();
    // Two anchors in one aim; a B-frame fragment whose decode origin sits
    // just BELOW anchor#2 but whose first-sample pts (baseDts + cts0) sits
    // just ABOVE it. Binding by baseDts picks anchor#1 (the decode axis is
    // monotonic and that is where the keyframe decodes); binding by pts would
    // wrongly pick anchor#2 and place the GOP ~5 s away.
    session.deliverAnchor(T0 - 9_000, 0);
    session.deliverAnchor(T0 - 4_000, 30 * 512);
    session.deliver(bFrameGop(30 * 512 - 256, 1, 512));

    const coverage = fetcher.store!.coverage();
    expect(coverage).toHaveLength(1);
    // Placed under anchor#1 (T0-9000, rtp 0): keyframe presents at its pts =
    // baseDts + cts0 = 30·512 − 256 + 512 = 30·512 + 256.
    expect(Math.abs(
      coverage[0].startTicks
        - (fetcher.store!.epochMsToTicks(T0 - 9_000) + 30 * 512 + 256),
    )).toBeLessThan(20);
  });

  it('an equal-rtp re-emission and a forward re-anchor never trip the rebase guard (#95)', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0, 30 * 512);
    // Same rtp re-emitted (periodic anchor) — allowed.
    session.deliverAnchor(T0, 30 * 512);
    // A forward re-anchor over a recording gap — higher rtp, allowed.
    session.deliverAnchor(T0 + 5_000, 90 * 512);
    session.deliver(gopAtBaseDts(30 * 512, 1));

    expect(events.unsupported).toHaveLength(0);
    expect(fetcher.store!.sampleCount).toBe(30);
  });

  it('after a supersede the own GOP binds the echo and a late tail binds the old mapping (#95)', async () => {
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0, 0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    await fetcher.extendBack();
    // The old aim's anchor re-emits first (same mapping) → parked as a
    // suspect, gate held. The real echo (new mapping) supersedes it and opens
    // the gate; the discarded suspect joins the ledger as prior truth.
    session.deliverAnchor(T0); // residue mapping → suspect
    session.deliverAnchor(T0 - 9_000, 60 * 512); // real echo → supersede
    // The aim's own first GOP binds the echo (new island)…
    session.deliver(gopAtBaseDts(60 * 512, 2));
    // …and a late in-flight tail BELOW the echo binds the OLD mapping, never
    // the echo — its ticks continue the old delivery onto uncovered terrain,
    // extending the original coverage forward rather than landing a
    // seek-distance off near the island.
    session.deliver(gopAtBaseDts(30 * 512, 3));

    expect(fetcher.preAimRebinds).toBe(1);
    const coverage = fetcher.store!.coverage();
    expect(coverage).toHaveLength(2);
    expect(coverage.some(
      (iv) => Math.abs(iv.startTicks - fetcher.store!.epochMsToTicks(T0 - 9_000)) < 20,
    )).toBe(true);
    expect(coverage.some(
      (iv) => Math.abs(iv.endTicks - fetcher.store!.epochMsToTicks(T0 + 2_000)) < 20,
    )).toBe(true);
  });

  it('a quiet previous aim stands the barrier down — the re-aim\'s first anchor binds immediately (P0.13)', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    // The completed aim sits quiet well past any in-flight window…
    await vi.advanceTimersByTimeAsync(600);

    // …then a probe lands essentially where it stood. Near-live delivery:
    // ONE anchor inside the old mapping band, no periodic re-emission ever.
    fetcher.refetchHole(T0 + 1_500);
    session.deliverAnchor(T0 + 17);
    session.deliver(gopAtBaseDts(35 * 512, 2));

    // No in-flight residue is possible out of a quiet session — the anchor
    // is the aim's own and binds immediately; a starved probe here would
    // become a ~3 s jump-skip.
    expect(fetcher.store!.sampleCount).toBe(60);
    expect(events.windowcomplete).toHaveLength(2);
    expect(fetcher.state).toBe('paused');
  });

  it('parks a suspect first anchor and binds it late when nothing supersedes (P0.13)', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    // Re-aim while the previous aim is still hot — residue IS plausible,
    // the barrier stands. Then sparse delivery: one anchor, one fragment,
    // silence.
    fetcher.refetchHole(T0 + 1_500);
    session.deliverAnchor(T0 + 17);
    session.deliver(gopAtBaseDts(35 * 512, 2));

    // Parked — nothing binds yet…
    expect(fetcher.store!.sampleCount).toBe(30);

    // …but silence must not starve the aim: the held anchor binds late and
    // the probe completes.
    await vi.advanceTimersByTimeAsync(1_600);
    expect(fetcher.store!.sampleCount).toBe(60);
    expect(events.windowcomplete).toHaveLength(2);
    expect(fetcher.state).toBe('paused');
  });

  it('a superseding anchor discards the parked suspect for good (P0.13)', async () => {
    vi.useFakeTimers();
    const { fetcher } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    await fetcher.extendBack();
    session.deliverAnchor(T0); // old aim's in-flight residue → parked
    session.deliver(gopAtBaseDts(30 * 512, 2));
    session.deliverAnchor(T0 - 9_000, 30 * 512); // the aim's real anchor
    expect(fetcher.store!.sampleCount).toBe(60);
    expect(fetcher.store!.coverage()).toHaveLength(2);

    // Past the hold window, a further fragment still binds to the REAL
    // mapping — the discarded suspect must never resurrect and re-bind.
    await vi.advanceTimersByTimeAsync(2_000);
    session.deliver(gopAtBaseDts(60 * 512, 3));
    expect(fetcher.store!.sampleCount).toBe(90);
    expect(fetcher.store!.coverage()).toHaveLength(2);
  });

  it('snap-stitches a wobbled same-footage overlap re-delivery — no conflict, no hole (§7.2)', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    // The same GOP re-delivered under an anchor wobbled half a frame — the
    // systematic overlap band that, when rejected, holed every extendBack
    // seam. The size sequence identifies the footage: snap and dedup, never
    // a conflict, never the cap ladder.
    fetcher.refetchHole(T0 + 500);
    session.deliverAnchor(T0 + 17);
    session.deliverAnchor(T0 + 17);
    session.deliverGop();

    expect(fetcher.stitchConflicts).toBe(0);
    expect(events.conflictfailed).toHaveLength(0);
    expect(events.unsupported).toHaveLength(0);
    expect(fetcher.store!.snapStitches).toBe(1);
    expect(fetcher.store!.sampleCount).toBe(30);
    expect(fetcher.store!.coverage()).toHaveLength(1);
    expect(fetcher.state).toBe('paused');
  });

  it('routes interleave conflicts into the per-aim conflict ladder (P0.10)', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();

    // FOREIGN footage delivered under an anchor placing it half a frame off
    // inside covered terrain — the corruption shape (a wobbled re-delivery
    // of the SAME footage would snap-stitch instead). Within the residue
    // tolerance → anchor re-emitted.
    fetcher.refetchHole(T0 + 500);
    session.deliverAnchor(T0 + 17);
    session.deliverAnchor(T0 + 17);
    session.deliver(foreignGopAtBaseDts(GOP01_BASE_DTS, 2));

    // Dropped as a stitch conflict on the cap ladder — never interleaved,
    // never a disable.
    expect(fetcher.stitchConflicts).toBe(1);
    expect(events.unsupported).toHaveLength(0);
    expect(events.conflictfailed).toHaveLength(0);
    expect(fetcher.store!.sampleCount).toBe(30);
  });

  it('drops a conflicting fragment, keeps the aim alive, and still inserts the rest of the drain (61b18591cc)', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(30);

    const store = fetcher.store!;
    const first = store.coverage()[0].startTicks;
    const e1 = store.nextSample(first)!.ticks;

    // Hole refetch whose delivery arrives before its anchor: fragment A is
    // FOREIGN footage landing one frame off inside covered terrain (no
    // sequence alignment exists → stitch conflict; the same bytes would
    // snap-stitch), fragment B a clean GOP re-stamped onto fresh terrain
    // covering the ask.
    fetcher.refetchHole(T0 + 4_500);
    session.deliver(foreignGopAtBaseDts(GOP01_BASE_DTS, 2));
    session.deliver(gopAtBaseDts(Math.round(store.epochMsToTicks(T0 + 4_000) - e1), 3));
    // One frame off the old mapping = within the residue tolerance:
    // delivered twice, as the server's periodic re-emission does.
    session.deliverAnchor(T0 + store.ticksToEpochMs(e1 - first));
    session.deliverAnchor(T0 + store.ticksToEpochMs(e1 - first));

    // A dropped, B inserted in the SAME drain — never 'unsupported'.
    expect(events.unsupported).toHaveLength(0);
    expect(events.conflictfailed).toHaveLength(0);
    expect(events.landingfailed).toHaveLength(0);
    expect(fetcher.stitchConflicts).toBe(1);
    expect(fetcher.store!.sampleCount).toBe(60);
    expect(events.windowcomplete).toHaveLength(2);
    expect(fetcher.state).toBe('paused');
  });

  it('caps per-aim conflicts and re-seeks once for a fresh anchor (M5)', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();

    const store = fetcher.store!;
    const first = store.coverage()[0].startTicks;
    const e1 = store.nextSample(first)!.ticks;
    const e2 = store.nextSample(e1)!.ticks;
    const e3 = store.nextSample(e2)!.ticks;

    fetcher.refetchHole(T0 + 4_500);
    session.seek.mockClear();
    session.pause.mockClear();
    session.resume.mockClear();
    // Three FOREIGN-footage fragments, each re-stamped so its keyframe
    // lands on a different existing delta tick — every fragment conflicts
    // (no sequence alignment exists); dropping more can never progress.
    // The hair-off anchor sits within the residue tolerance, so it arrives
    // twice (periodic re-emission).
    session.deliverAnchor(T0 + store.ticksToEpochMs(e1 - first));
    session.deliverAnchor(T0 + store.ticksToEpochMs(e1 - first));
    session.deliver(foreignGopAtBaseDts(GOP01_BASE_DTS, 2));
    session.deliver(foreignGopAtBaseDts(Math.round(e2 - e1), 3));
    session.deliver(foreignGopAtBaseDts(Math.round(e3 - e1), 4));

    expect(fetcher.stitchConflicts).toBe(3);
    expect(events.unsupported).toHaveLength(0);
    expect(events.conflictfailed).toHaveLength(0);
    expect(session.pause).toHaveBeenCalled();
    expect(session.seek).not.toHaveBeenCalled();

    // Bounded fresh-anchor re-seek fires toward the hole ask, still paused.
    await vi.advanceTimersByTimeAsync(1_300);
    expect(session.seek).toHaveBeenCalledWith(T0 + 4_500);
    expect(session.resume).not.toHaveBeenCalled();

    // The fresh anchor binds cleanly and the aim recovers end-to-end.
    session.deliverAnchor(T0 + 4_000);
    session.deliverGop();
    expect(fetcher.store!.sampleCount).toBe(60);
    expect(events.windowcomplete).toHaveLength(2);
    expect(events.landingfailed).toHaveLength(0);
    expect(events.noearlierdata).toHaveLength(0);
    expect(events.conflictfailed).toHaveLength(0);
    expect(fetcher.state).toBe('paused');
  });

  it('conflicts persisting across the fresh anchor abandon the aim with conflictfailed, never a boundary or disable', async () => {
    vi.useFakeTimers();
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();

    const store = fetcher.store!;
    const first = store.coverage()[0].startTicks;
    const e1 = store.nextSample(first)!.ticks;
    const e2 = store.nextSample(e1)!.ticks;
    const e3 = store.nextSample(e2)!.ticks;
    const conflictAnchorMs = T0 + store.ticksToEpochMs(e1 - first);

    fetcher.refetchHole(T0 + 4_500);
    // Hair-off the old mapping → residue tolerance → delivered twice.
    // Foreign footage: no sequence alignment, every fragment conflicts.
    session.deliverAnchor(conflictAnchorMs);
    session.deliverAnchor(conflictAnchorMs);
    session.deliver(foreignGopAtBaseDts(GOP01_BASE_DTS, 2));
    session.deliver(foreignGopAtBaseDts(Math.round(e2 - e1), 3));
    session.deliver(foreignGopAtBaseDts(Math.round(e3 - e1), 4));
    await vi.advanceTimersByTimeAsync(1_300); // fresh-anchor re-seek fires

    // The re-seeked aim delivers the same conflicting terrain again.
    session.deliverAnchor(conflictAnchorMs);
    session.deliverAnchor(conflictAnchorMs);
    session.deliver(foreignGopAtBaseDts(GOP01_BASE_DTS, 5));
    session.deliver(foreignGopAtBaseDts(Math.round(e2 - e1), 6));
    session.deliver(foreignGopAtBaseDts(Math.round(e3 - e1), 7));

    // The data exists — it conflicted, it is not absent: an aim abandon,
    // not a no-earlier-data verdict, not a terminal failure.
    expect(events.conflictfailed).toHaveLength(1);
    expect(events.landingfailed).toHaveLength(0);
    expect(events.noearlierdata).toHaveLength(0);
    expect(events.unsupported).toHaveLength(0);
    expect(fetcher.stitchConflicts).toBe(6);
    expect(fetcher.store!.sampleCount).toBe(30); // coverage never corrupted
    expect(fetcher.state).toBe('paused');

    // A late in-flight buffer (pause not landed yet) that conflicts again
    // must not re-emit.
    session.deliver(foreignGopAtBaseDts(GOP01_BASE_DTS, 8));
    expect(events.conflictfailed).toHaveLength(1);
  });

  it('a post-reset mid-box tail neither wedges the next aim nor escalates to unsupported (M11)', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();
    session.deliverAnchor(T0);
    session.deliverGop();
    expect(fetcher.state).toBe('paused');

    // The previous aim's fragment is cut mid-mdat…
    session.deliver(GOP01.slice(0, 1_000));
    // …the owner re-aims (synchronous parser reset)…
    fetcher.refetchHole(T0 + 4_500);
    // …and the truncated fragment's remainder keeps streaming for ≥1 RTT:
    // raw mdat payload beginning MID-BOX. It must be skipped, not trusted.
    session.deliver(GOP01.slice(1_000));
    expect(events.unsupported).toHaveLength(0);

    // The new aim's clean delivery then parses from its first box.
    session.deliverAnchor(T0 + 4_000);
    session.deliverGop();
    expect(events.unsupported).toHaveLength(0);
    expect(fetcher.store!.sampleCount).toBe(60);
    expect(events.windowcomplete).toHaveLength(2);
    expect(fetcher.state).toBe('paused');
  });

  it('maps an in-flight parser exception to a clean unsupported failure, never a silent swallow (M11)', async () => {
    const { fetcher, events } = makeFetcher();
    await fetcher.openWindow(T0 + 500);
    const session = lastSession();
    session.deliverInit();

    session.deliver(fragmentThatThrows(fetcher.init!.videoTrack!.id));

    expect(events.unsupported).toEqual(['parser exception']);
    expect(fetcher.state).toBe('failed');
    await expect(fetcher.openWindow(T0)).rejects.toThrow('failed');
  });
});
