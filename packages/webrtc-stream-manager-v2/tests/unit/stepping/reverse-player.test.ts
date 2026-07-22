// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, beforeEach } from 'vitest';

import { ReversePlayer } from '../../../src/stepping/reverse-player';
import { SampleStore } from '../../../src/stepping/sample-store';
import type { BackfillFetcher } from '../../../src/stepping/backfill-fetcher';
import type { GopDecoder } from '../../../src/stepping/gop-decoder';
import {
  TIMESCALE, T0, SAMPLE_MS, SPAN_MS,
  makeStore, appendOlderGop, MockFetcher, MockDecoder, ManualClock, flush, msOf,
  type FakeFrame,
} from './doubles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlayer(opts: {
  store?: SampleStore;
  alwaysHit?: boolean;
  clock?: ManualClock;
  windowMs?: number;
} = {}) {
  MockDecoder.instances = [];
  const store = opts.store ?? makeStore({ gops: 60 });
  const fetcher = new MockFetcher(store);
  const clock = opts.clock ?? new ManualClock();
  const alwaysHit = opts.alwaysHit ?? true;
  const player = new ReversePlayer({
    fetcher: fetcher as unknown as BackfillFetcher,
    createDecoder: (ts) => {
      const d = new MockDecoder(ts);
      d.alwaysHit = alwaysHit;
      return d as unknown as GopDecoder;
    },
    clock,
    windowMs: opts.windowMs,
  });
  const events: { frame: { epochMs: number; frame: FakeFrame }[]; state: string[]; autostopped: { reason: string; cursorEpochMs: number | null }[]; governed: { requestedRate: number; effectiveRate: number }[]; disabled: string[] } = {
    frame: [], state: [], autostopped: [], governed: [], disabled: [],
  };
  player.on('frame', (d) => events.frame.push(d as unknown as { epochMs: number; frame: FakeFrame }));
  player.on('state', (s) => events.state.push(s));
  player.on('autostopped', (d) => events.autostopped.push(d));
  player.on('governed', (d) => events.governed.push(d));
  player.on('disabled', (r) => events.disabled.push(r));
  return { player, fetcher, clock, events, store };
}

/** One key-led GOP with the given per-sample tick intervals (variable-frame-rate). */
function makeVfrStore(deltaTicks: number[]): SampleStore {
  const store = new SampleStore({ timescale: TIMESCALE });
  const epoch = store.registerConfig({
    codec: 'avc1.420032', description: new Uint8Array([1, 0x42, 0x00, 0x32]),
  });
  const ptsList = [0];
  for (const d of deltaTicks) ptsList.push(ptsList[ptsList.length - 1] + d);
  const samples = ptsList.map((pts, i) => ({
    dts: pts, pts,
    duration: i < deltaTicks.length ? deltaTicks[i] : deltaTicks[deltaTicks.length - 1],
    key: i === 0, bytes: new Uint8Array(100),
  }));
  store.insertFragment(
    { seq: 1, trackId: 1, baseDts: 0, samples },
    { timestampMs: T0 - 10_000, rtpTimestamp: 0 },
    epoch,
  );
  return store;
}

/** All sample archive-ms in the store, newest first. */
function descendingSampleMs(store: SampleStore): number[] {
  const out: number[] = [];
  let t = store.coverage().at(-1)!.endTicks;
  for (let s = store.prevSample(t); s; s = store.prevSample(s.ticks)) {
    out.push(store.ticksToEpochMs(s.ticks));
  }
  return out;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ReversePlayer', () => {
  beforeEach(() => {
    MockDecoder.instances = [];
    MockDecoder.globalFailNext = 0;
  });

  it('paces to the exact real sample ticks under VFR (epochMs = real ticks, no fps arithmetic)', () => {
    // Intervals ≈ 30/45/60/75 ms — non-uniform.
    const store = makeVfrStore([461, 691, 922, 1152]);
    const clock = new ManualClock();
    const { player, events } = makePlayer({ store, clock });
    const expected = descendingSampleMs(store); // newest → oldest

    player.play(expected[0], -1);
    clock.advance(400); // covers the whole ≈210 ms span at −1×

    const painted = events.frame.map((f) => f.epochMs);
    expect(painted).toHaveLength(expected.length);
    painted.forEach((ms, i) => expect(ms).toBeCloseTo(expected[i], 3));
    // Strictly descending — every real sample, in order, none fabricated.
    for (let i = 1; i < painted.length; i++) {
      expect(painted[i]).toBeLessThan(painted[i - 1]);
    }
  });

  it('late wake at −4× paints only the floor sample (skip, never slow-motion)', () => {
    const clock = new ManualClock();
    const { player, events } = makePlayer({ clock });
    player.play(T0, -4);
    expect(events.frame).toHaveLength(1); // the anchor frame
    const anchorMs = events.frame[0].epochMs;

    // The scheduler armed for the next sample; the tab was frozen — fire it very
    // late (the clock is already ~5 samples' worth of archive below).
    clock.advanceLate(5 * SAMPLE_MS / 4 + 5); // 5 samples of archive at −4×

    // Exactly one catch-up paint, at the floor — not five slow-motion paints.
    expect(events.frame).toHaveLength(2);
    const skipped = anchorMs - events.frame[1].epochMs;
    expect(skipped).toBeGreaterThan(4 * SAMPLE_MS); // jumped past ≥4 intermediate frames
  });

  it('paints EVERY frame at −2× and −4× (no half-rate frame dropping)', () => {
    for (const rate of [-2, -4] as const) {
      const clock = new ManualClock();
      const { player, events } = makePlayer({ clock });
      player.play(T0, rate);
      clock.advance(1_000); // on-time wakes across ≥ 2 s of archive
      const painted = events.frame.map((f) => f.epochMs);
      expect(painted.length).toBeGreaterThan(10);
      // Consecutive painted frames are ADJACENT samples (gap ≈ one sample),
      // not every-other (which the rate-scaled slop bug produced).
      for (let i = 1; i < painted.length; i++) {
        expect(painted[i - 1] - painted[i]).toBeCloseTo(SAMPLE_MS, 0);
      }
    }
  });

  it('paints EVERY frame at fractional −0.5× and descends at half wall speed', () => {
    const clock = new ManualClock();
    const { player, events } = makePlayer({ clock });
    player.play(T0, -0.5);
    const anchorMs = events.frame[0].epochMs;

    clock.advance(2_000); // 2 s wall ⇒ 1 s of archive at −0.5×

    const painted = events.frame.map((f) => f.epochMs);
    expect(painted.length).toBeGreaterThan(10);
    // Adjacent samples, none skipped — slower-than-realtime must not drop frames.
    for (let i = 1; i < painted.length; i++) {
      expect(painted[i - 1] - painted[i]).toBeCloseTo(SAMPLE_MS, 0);
    }
    expect(Math.abs((anchorMs - player.cursorEpochMs!) - 1_000)).toBeLessThan(SAMPLE_MS + 2);
  });

  it('setRate re-anchors presentation-only: −1× 1 s then −4× 1 s ⇒ cursor 5 s below start', () => {
    const clock = new ManualClock();
    const { player, fetcher, events } = makePlayer({ clock });
    const startMs = T0 - SAMPLE_MS; // newest sample ≈ T0 − 33 ms
    player.play(msOf(fetcher.store!, fetcher.store!.floorSample(fetcher.store!.epochMsToTicks(startMs))!.ticks), -1);
    const anchorMs = events.frame[0].epochMs;

    clock.advance(1_000);
    const afterOne = player.cursorEpochMs!;
    expect(Math.abs((anchorMs - afterOne) - 1_000)).toBeLessThan(SAMPLE_MS + 2); // ≈1 s down at −1×

    player.setRate(-4);
    fetcher.openAtAnchor.mockClear();
    clock.advance(1_000);

    expect(Math.abs((anchorMs - player.cursorEpochMs!) - 5_000)).toBeLessThan(SAMPLE_MS + 2); // 1 s + 4 s ≈ 5 s
    // Presentation-only: no session was reopened for the rate change.
    expect(fetcher.openAtAnchor).not.toHaveBeenCalled();
  });

  it('prefetches the previous GOP so a boundary step paints from cache', async () => {
    const clock = new ManualClock();
    const { player, store } = makePlayer({ clock, alwaysHit: false });
    const topMs = descendingSampleMs(store)[0];
    // The GOP one below the anchor's GOP — its keyframe should be prefetched.
    const anchorTicks = store.floorSample(store.epochMsToTicks(topMs))!.ticks;
    const belowGopTail = store.prevSample(store.gopFor(anchorTicks)!.samples[0].ticks)!;
    const belowGopKey = store.gopFor(belowGopTail.ticks)!.samples[0].ticks;

    player.play(topMs, -4); // decode-ahead 2.4 s ⇒ prefetch several GOPs
    await flush();
    await flush();

    const decoder = MockDecoder.instances[0];
    const runs = decoder.frameAt.mock.calls.map((c) => c[0] as { samples: { ticks: number }[] });
    // The GOP below the anchor was decoded ahead of the cursor reaching it.
    expect(runs.some((r) => Math.abs(r.samples[0].ticks - belowGopKey) < 1)).toBe(true);
  });

  it('byte-gates prefetch: a near-full decoder cache stops decode-ahead (4K JIT policy)', async () => {
    const clock = new ManualClock();
    const { player } = makePlayer({ clock, alwaysHit: false });
    // Create the decoder via a first paint, then jam the cache near the cap.
    player.play(T0, -4);
    await flush();
    const decoder = MockDecoder.instances[0];
    decoder.cacheBytes = decoder.byteCap; // ≥ 0.9× cap ⇒ gate closed
    const callsBefore = decoder.frameAt.mock.calls.length;

    clock.advance(SAMPLE_MS * 2 + 5); // one paced step
    await flush();

    // The step still paints (JIT decode of exactly what's due) but no GOP is
    // decoded ahead beyond it.
    const newCalls = decoder.frameAt.mock.calls.length - callsBefore;
    expect(newCalls).toBeLessThanOrEqual(1);
    expect(decoder.trimAbove).toHaveBeenCalled(); // trim runs on every paint
  });

  it('starvation → buffering → resume once a shallow runway is covered', () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 3 }); // ~0.5 s runway
    const { player, fetcher, events } = makePlayer({ store, clock });

    player.play(T0, -1);
    clock.advance(1_000); // drain past the runway
    expect(player.state).toBe('buffering');
    expect(events.state).toContain('buffering');

    // Refill well past the resume runway, then signal delivery.
    for (let i = 0; i < 45; i++) appendOlderGop(store, 100 + i);
    fetcher.state = 'paused';
    fetcher.emit('progress', { addedSamples: 5 });

    expect(player.state).toBe('playing');
  });

  it('bounds rebuffering: three fruitless stalls autostop into stepping (supply-stalled)', () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 2 });
    const { player, fetcher, events } = makePlayer({ store, clock });

    player.play(T0, -1);
    clock.advance(1_000);
    expect(player.state).toBe('buffering');
    fetcher.state = 'paused';
    fetcher.extendBack.mockClear();

    fetcher.emit('stalled'); // strike 1 → settle + re-aim
    expect(player.state).toBe('buffering');
    fetcher.emit('stalled'); // strike 2 → re-aim
    expect(player.state).toBe('buffering');
    fetcher.emit('stalled'); // strike 3 → autostop
    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'supply-stalled' }),
    ]);
    expect(fetcher.extendBack).toHaveBeenCalledTimes(2); // strikes 1 and 2 only
  });

  it('concludes archive start on two zero-growth extends and autostops at the floor', () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 2 });
    const { player, fetcher, events } = makePlayer({ store, clock });

    player.play(T0, -1);
    clock.advance(1_000);
    expect(player.state).toBe('buffering');
    const floorMs = store.ticksToEpochMs(store.coverage()[0].startTicks);
    fetcher.state = 'paused';

    // Two extends complete with no backward growth (nothing appended).
    fetcher.emit('windowcomplete');
    expect(player.state).toBe('buffering');
    fetcher.emit('windowcomplete');

    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'archive-start' }),
    ]);
    expect(events.autostopped[0].cursorEpochMs).toBeCloseTo(floorMs, 0);
  });

  it('bounds conflictfailed while buffering → autostop supply-stalled (no infinite re-aim)', () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 2 });
    const { player, fetcher, events } = makePlayer({ store, clock });
    player.play(T0, -1);
    clock.advance(1_000);
    expect(player.state).toBe('buffering');
    fetcher.state = 'paused';

    // Conflicting delivery never fires 'stalled' (it re-arms the watchdog); the
    // bound must come from conflictfailed itself.
    fetcher.emit('conflictfailed');
    expect(player.state).toBe('buffering');
    fetcher.emit('conflictfailed');
    expect(player.state).toBe('buffering');
    fetcher.emit('conflictfailed');
    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'supply-stalled' }),
    ]);
  });

  it('flapping buffering↔resume without a paint cannot dodge the wedge bound (autostop supply-stalled)', async () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 45 }); // ample headroom so resume conditions keep passing
    const { player, fetcher, events } = makePlayer({ store, clock, alwaysHit: false });
    // Every GOP is undecodable (a poisoned seam below the whole runway):
    // present() can never paint, so each resume flaps straight back to buffering.
    (store as unknown as { gopFor: () => null }).gopFor = () => null;
    fetcher.state = 'paused';

    player.play(T0, -1);
    expect(player.state).toBe('buffering');

    // Each progress extends the wedge bound (delivery IS flowing), so the flap
    // loop now runs to the 30 s TOTAL bound rather than the 10 s per-spell one.
    for (let i = 0; i < 40 && player.state !== 'idle'; i++) {
      fetcher.emit('progress', { addedSamples: 5 }); // resume → playing
      clock.advance(1_000); // next tick → present fails → buffering again
    }

    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'supply-stalled' }),
    ]);
    // It really was a flap loop, not one long buffering spell.
    expect(events.state.filter((s) => s === 'playing').length).toBeGreaterThanOrEqual(2);
  });

  it('time-bounds a buffering wedge: a forever-collecting fetcher autostops (supply-stalled)', () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 2 });
    const { player, fetcher, events } = makePlayer({ store, clock });
    player.play(T0, -1);
    clock.advance(1_000); // drain past the runway → buffering
    expect(player.state).toBe('buffering');

    // Delivery churns without resting or stalling: the fetcher stays
    // 'collecting', so none of the ladder's events (stalled / windowcomplete /
    // conflictfailed) ever fire and the resume condition is never met. Only
    // the time bound can end the spell.
    fetcher.state = 'collecting';
    clock.advance(9_000);
    expect(player.state).toBe('buffering');
    clock.advance(1_000); // past BUFFERING_WEDGE_TIMEOUT_MS since the spell began
    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'supply-stalled' }),
    ]);
  });

  it('time-bounds a cold start that never resolves (no paint within the cold bound → autostop)', () => {
    const clock = new ManualClock();
    const { player, events, store } = makePlayer({ clock });
    const aboveMs = store.ticksToEpochMs(store.coverage().at(-1)!.endTicks) + 60_000;

    player.play(aboveMs, -1); // cold aim; no delivery ever resolves it
    expect(player.state).toBe('starting');
    clock.advance(14_000);
    expect(player.state).toBe('starting'); // inside the cold bound
    clock.advance(1_500);
    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'supply-stalled' }),
    ]);
  });

  it('scrub forward above coverage takes the cold path, not a stale warm snap', () => {
    const { player, fetcher, events, store } = makePlayer();
    const aboveMs = store.ticksToEpochMs(store.coverage().at(-1)!.endTicks) + 10_000;

    player.play(aboveMs, -1);

    // floorSample alone clamps to the stale coverage top; covers() must gate the
    // warm path so an uncovered anchor re-aims the fetch session instead.
    expect(fetcher.openAtAnchor).toHaveBeenCalledWith(aboveMs);
    expect(player.state).toBe('starting');
    expect(events.frame).toHaveLength(0); // never snapped back to the coverage top
  });

  it('re-anchor within coverage still warms (paints immediately, no re-aim)', () => {
    const { player, fetcher, events, store } = makePlayer();
    const coveredMs = store.ticksToEpochMs(store.prevSample(store.coverage().at(-1)!.endTicks)!.ticks);

    player.play(coveredMs, -1);

    expect(events.frame).toHaveLength(1); // warm: painted frame 1 synchronously
    expect(fetcher.openAtAnchor).not.toHaveBeenCalled();
  });

  it('cold start below all coverage autostops into stepping (never wedges in starting)', () => {
    const clock = new ManualClock();
    const { player, fetcher, events } = makePlayer({ clock });
    const store = fetcher.store!;
    const belowAllMs = store.ticksToEpochMs(store.coverage()[0].startTicks) - 1_000_000;

    player.play(belowAllMs, -1);
    expect(player.state).toBe('starting'); // cold: nothing at/below the anchor
    expect(fetcher.openAtAnchor).toHaveBeenCalled();

    // The server has nothing older — a cold aim has no follow-up to resolve on.
    fetcher.emit('noearlierdata');
    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'archive-start' }),
    ]);
    expect(events.autostopped[0].cursorEpochMs).toBeCloseTo(belowAllMs, 0);
  });

  it('cold start that never delivers autostops (supply-stalled) after bounded stalls', () => {
    const clock = new ManualClock();
    const { player, fetcher, events } = makePlayer({ clock });
    const store = fetcher.store!;
    const belowAllMs = store.ticksToEpochMs(store.coverage()[0].startTicks) - 1_000_000;

    player.play(belowAllMs, -1);
    expect(player.state).toBe('starting');
    fetcher.state = 'collecting';

    fetcher.emit('stalled');
    expect(player.state).toBe('starting');
    fetcher.emit('stalled');
    expect(player.state).toBe('starting');
    fetcher.emit('stalled');
    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'supply-stalled' }),
    ]);
  });

  it('autostop before anything painted reports a null cursor, not epoch 0', () => {
    const clock = new ManualClock();
    MockDecoder.instances = [];
    const fetcher = new MockFetcher(null);
    const player = new ReversePlayer({
      fetcher: fetcher as unknown as BackfillFetcher,
      createDecoder: (ts) => new MockDecoder(ts) as unknown as GopDecoder,
      clock,
    });
    const stopped: { reason: string; cursorEpochMs: number | null }[] = [];
    player.on('autostopped', (d) => stopped.push(d));

    player.play(T0, -1);
    expect(player.state).toBe('starting');
    fetcher.state = 'collecting';
    fetcher.emit('stalled');
    fetcher.emit('stalled');
    fetcher.emit('stalled');

    expect(player.state).toBe('idle');
    expect(stopped).toEqual([{ reason: 'supply-stalled', cursorEpochMs: null }]);
  });

  it('noearlierdata concludes archive start immediately', () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 2 });
    const { player, fetcher, events } = makePlayer({ store, clock });
    player.play(T0, -1);
    clock.advance(1_000);
    expect(player.state).toBe('buffering');

    fetcher.emit('noearlierdata');
    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'archive-start' }),
    ]);
  });

  it('noearlierdata with the oracle saying no earlier data concludes archive start', () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 2 });
    const { player, fetcher, events } = makePlayer({ store, clock });
    fetcher.hasRecordedDataBefore.mockReturnValue(false);
    player.play(T0, -1);
    clock.advance(1_000);
    expect(player.state).toBe('buffering');

    fetcher.emit('noearlierdata');
    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'archive-start' }),
    ]);
  });

  it('noearlierdata retries when the oracle proves earlier data, then autostops supply-stalled', () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 2 });
    const { player, fetcher, events } = makePlayer({ store, clock });
    fetcher.hasRecordedDataBefore.mockReturnValue(true);
    player.play(T0, -1);
    clock.advance(1_000);
    expect(player.state).toBe('buffering');
    fetcher.state = 'paused';
    const aimsBefore = fetcher.extendBack.mock.calls.length;

    // Two bounded retries — each re-aims (the fetcher's extendBack gap-hops).
    fetcher.emit('noearlierdata');
    expect(player.state).toBe('buffering');
    expect(fetcher.extendBack.mock.calls.length).toBe(aimsBefore + 1);
    fetcher.emit('noearlierdata');
    expect(player.state).toBe('buffering');
    expect(events.autostopped).toHaveLength(0);

    // Budget exhausted: the data provably exists — the honest verdict is
    // supply-stalled, never archive-start.
    fetcher.emit('noearlierdata');
    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'supply-stalled' }),
    ]);
  });

  it('zero-growth extends retry instead of concluding when the oracle proves earlier data', () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 2 });
    const { player, fetcher, events } = makePlayer({ store, clock });
    fetcher.hasRecordedDataBefore.mockReturnValue(true);
    player.play(T0, -1);
    clock.advance(1_000);
    expect(player.state).toBe('buffering');
    fetcher.state = 'paused';

    // Each zero-growth pair burns one retry; the third pair exhausts the
    // budget → supply-stalled (2 zero-growth aims × 3 rounds).
    for (let i = 0; i < 5; i++) {
      fetcher.emit('windowcomplete');
      expect(player.state).toBe('buffering');
    }
    fetcher.emit('windowcomplete');
    expect(player.state).toBe('idle');
    expect(events.autostopped).toEqual([
      expect.objectContaining({ reason: 'supply-stalled' }),
    ]);
  });

  it('the gap-hop retry budget replenishes on real delivery progress', () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 2 });
    const { player, fetcher, events } = makePlayer({ store, clock });
    fetcher.hasRecordedDataBefore.mockReturnValue(true);
    player.play(T0, -1);
    clock.advance(1_000);
    expect(player.state).toBe('buffering');
    fetcher.state = 'paused';

    // Burn the whole retry budget…
    fetcher.emit('noearlierdata');
    fetcher.emit('noearlierdata');
    expect(player.state).toBe('buffering');

    // …then real growth lands (the hop worked): the ladder resets.
    appendOlderGop(store, 90);
    fetcher.emit('progress', { addedSamples: 5 });

    // A fresh round of failures gets a fresh budget — no premature autostop.
    fetcher.emit('noearlierdata');
    fetcher.emit('noearlierdata');
    expect(player.state).toBe('buffering');
    expect(events.autostopped).toHaveLength(0);
  });

  it('resumes from buffering and jumps the gap once the hopped island lands', () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 2 });
    const { player, fetcher, events } = makePlayer({ store, clock });
    fetcher.spanIsGapFree.mockReturnValue(false);
    player.play(T0, -1);
    clock.advance(1_000);
    expect(player.state).toBe('buffering');
    fetcher.state = 'paused';

    // The hopped aim delivers the previous chunk's tail: a detached island
    // 5 s below the current coverage floor.
    const oldestMs = store.ticksToEpochMs(store.coverage()[0].startTicks);
    const baseDts = 90 * 5 * 512;
    store.insertFragment(
      {
        seq: 99, trackId: 1, baseDts,
        samples: Array.from({ length: 5 }, (_, i) => ({
          dts: baseDts + i * 512, pts: baseDts + i * 512,
          duration: 512, key: i === 0, bytes: new Uint8Array(100),
        })),
      },
      { timestampMs: oldestMs - 5_000, rtpTimestamp: baseDts },
      0,
    );
    const islandTopMs = store.ticksToEpochMs(store.coverage()[0].endTicks - 512);
    fetcher.emit('windowcomplete');

    // Resumed across the hole and re-anchored at the island's top frame.
    expect(player.state).toBe('playing');
    expect(events.autostopped).toHaveLength(0);
    expect(events.frame.at(-1)!.epochMs).toBeCloseTo(islandTopMs, 0);
  });

  it('jumps a recording hole instead of crawling (fetcher paused → instant re-anchor)', () => {
    const clock = new ManualClock();
    const store = makeStore({ gap: true, gops: 3 }); // hole under the newest GOP
    const { player, events } = makePlayer({ store, clock });
    const islandTopMs = store.ticksToEpochMs(store.coverage()[0].endTicks - store.epochMsToTicks(SAMPLE_MS));

    player.play(T0, -1); // starts in GOP 0 (above the hole)
    clock.advance(400); // drain GOP 0, reach the hole

    // The next painted frame is the lower island's tail — the empty hole was
    // never crawled through in wall time.
    const last = events.frame.at(-1)!;
    expect(last.epochMs).toBeLessThan(store.ticksToEpochMs(store.coverage().at(-1)!.startTicks));
    // No frame landed inside the hole span.
    const holeTopMs = store.ticksToEpochMs(store.coverage().at(-1)!.startTicks);
    const painted = events.frame.map((f) => f.epochMs);
    expect(painted.some((ms) => ms < holeTopMs && ms > islandTopMs + SAMPLE_MS)).toBe(false);
  });

  it('holds pace across an ARTIFACT hole (oracle: archive continuous) instead of jumping instantly', () => {
    const clock = new ManualClock();
    const store = makeStore({ gap: true, gops: 3 }); // 500 ms hole under the newest GOP
    const { player, fetcher, events } = makePlayer({ store, clock });
    fetcher.spanIsGapFree.mockReturnValue(true); // chunk oracle: no recording gap here

    player.play(T0, -1);
    clock.advance(SPAN_MS + 50); // drain GOP 0 to the hole
    const atHole = events.frame.length;
    expect(atHole).toBeGreaterThan(0);

    // Inside the paced hold: the island below is not due yet — no instant jump.
    clock.advance(250);
    expect(events.frame.length).toBe(atHole);

    // Past the hole's paced duration: the island paints, position skips the hole.
    clock.advance(500);
    expect(events.frame.length).toBeGreaterThan(atHole);
    const newestIntervalStartMs = store.ticksToEpochMs(store.coverage().at(-1)!.startTicks);
    expect(events.frame.at(-1)!.epochMs).toBeLessThan(newestIntervalStartMs);
  });

  it('paces an undecodable-seam skip: the next GOP paints at its due time, never instantly', async () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 3 });
    const { player, events } = makePlayer({ store, clock, alwaysHit: false });
    // GOP 1 (middle) is a poisoned seam: covered but undecodable.
    const cov = store.coverage()[0];
    const gop1Top = cov.endTicks - store.epochMsToTicks(SPAN_MS);
    const gop1Bottom = cov.endTicks - store.epochMsToTicks(2 * SPAN_MS);
    const realGopFor = store.gopFor.bind(store);
    store.gopFor = (t: number) =>
      (t >= gop1Bottom && t < gop1Top ? null : realGopFor(t));

    player.play(T0, -1);
    clock.advance(SPAN_MS + 40); // drain GOP 0 to the seam
    await Promise.resolve();
    const atSeam = events.frame.length;

    // The skip target (GOP 2's key) is one GOP-span away — held, not instant.
    clock.advance(60);
    expect(events.frame.length).toBe(atSeam);

    clock.advance(SPAN_MS + 100); // past the seam's paced duration
    await flush();
    expect(events.frame.length).toBeGreaterThan(atSeam);
    // Nothing painted inside the poisoned GOP.
    const seamTopMs = store.ticksToEpochMs(gop1Top);
    const seamBottomMs = store.ticksToEpochMs(gop1Bottom);
    expect(events.frame.some((f) => f.epochMs < seamTopMs && f.epochMs >= seamBottomMs)).toBe(false);
  });

  it('holds at a hole while an aim is collecting into it, then jumps on windowcomplete', () => {
    const clock = new ManualClock();
    const store = makeStore({ gap: true, gops: 3 });
    const { player } = makePlayer({ store, clock });
    const fetcher = (player as unknown as { fetcher: MockFetcher }).fetcher;

    player.play(T0, -1);
    fetcher.state = 'collecting'; // an aim is in flight into the gap
    clock.advance(400); // drain GOP 0 to the hole
    expect(player.state).toBe('buffering'); // held, not crawled

    // The aim completes with the gap still open → jump to the island.
    fetcher.state = 'paused';
    const framesBefore = (player as unknown as { cursorTicks: number }).cursorTicks;
    fetcher.emit('windowcomplete');
    expect(player.state).toBe('playing');
    expect((player as unknown as { cursorTicks: number }).cursorTicks).toBeLessThan(framesBefore);
  });

  it('session loss rebuilds once at the cursor; a consecutive loss disables', () => {
    const clock = new ManualClock();
    const { player, fetcher, events } = makePlayer({ clock });
    player.play(T0, -1);
    clock.advance(200);
    const cursorMs = player.cursorEpochMs!;
    fetcher.openAtAnchor.mockClear();

    // First loss: rebuild (buffer during the reopen), not disabled.
    fetcher.emit('sessionlost');
    expect(player.state).toBe('buffering');
    expect(events.disabled).toHaveLength(0);
    expect(fetcher.openAtAnchor).toHaveBeenCalledTimes(1);
    expect(fetcher.openAtAnchor.mock.calls[0][0]).toBeCloseTo(cursorMs, 0);

    // Healthy delivery clears the ladder…
    fetcher.emit('progress', { addedSamples: 5 });
    fetcher.emit('sessionlost');
    expect(player.state).toBe('buffering');
    expect(fetcher.openAtAnchor).toHaveBeenCalledTimes(2);

    // …a second consecutive loss disables.
    fetcher.emit('sessionlost');
    expect(player.state).toBe('disabled');
    expect(events.disabled).toEqual(['fetch session lost']);
    expect(fetcher.pauseDelivery).toHaveBeenCalled();
  });

  it('session loss during a cold start retries the pending anchor, not epoch 0', () => {
    const clock = new ManualClock();
    MockDecoder.instances = [];
    const fetcher = new MockFetcher(null);
    const player = new ReversePlayer({
      fetcher: fetcher as unknown as BackfillFetcher,
      createDecoder: (ts) => new MockDecoder(ts) as unknown as GopDecoder,
      clock,
    });
    player.play(T0, -1);
    expect(player.state).toBe('starting');
    expect(fetcher.openAtAnchor).toHaveBeenCalledTimes(1);
    expect(fetcher.openAtAnchor.mock.calls[0][0]).toBe(T0);

    fetcher.emit('sessionlost');
    // Still 'starting' (not buffering) — onProgress can resolve the cold entry.
    expect(player.state).toBe('starting');
    expect(fetcher.openAtAnchor).toHaveBeenCalledTimes(2);
    expect(fetcher.openAtAnchor.mock.calls[1][0]).toBe(T0);
  });

  it('play widens the fetch window to 20 s; stop restores it and disposes the decoder', () => {
    const clock = new ManualClock();
    const { player, fetcher } = makePlayer({ clock });
    expect(fetcher.windowMs).toBe(10_000);

    player.play(T0, -1);
    expect(fetcher.setWindowMs).toHaveBeenCalledWith(20_000);
    expect(fetcher.windowMs).toBe(20_000);
    const decoder = MockDecoder.instances[0];

    player.stop();
    expect(fetcher.windowMs).toBe(10_000); // restored
    expect(decoder.dispose).toHaveBeenCalled();
    expect(player.state).toBe('idle');
    // Cursor stays readable after stop (the coordinator hands it to stepping).
    expect(player.cursorEpochMs).not.toBeNull();
  });

  it('play raises the fetch-session speed to 4; stop restores the stepping default', () => {
    const clock = new ManualClock();
    const { player, fetcher } = makePlayer({ clock });
    expect(fetcher.fetchSpeed).toBeUndefined();

    player.play(T0, -1);
    expect(fetcher.setFetchSpeed).toHaveBeenCalledWith(4);
    expect(fetcher.fetchSpeed).toBe(4);

    player.stop();
    expect(fetcher.fetchSpeed).toBeUndefined(); // stepping sessions keep the factory default
  });

  it('recreates the decoder after one decode failure, then paints', async () => {
    // The cold-start decode faults once; the player recreates the decoder and
    // retries transparently. (Prefetch faults are swallowed, so the ladder is
    // driven through an actual paint decode.)
    MockDecoder.globalFailNext = 1;
    const { player, events } = makePlayer({ clock: new ManualClock(), alwaysHit: false });
    player.play(T0, -1);
    await flush();
    await flush();
    expect(MockDecoder.instances.length).toBeGreaterThanOrEqual(2); // recreated
    expect(player.state).not.toBe('disabled');
    expect(events.frame.length).toBeGreaterThanOrEqual(1);
  });

  it('skips a decode-poisoned GOP after two failures and paints the GOP below (not disabled)', async () => {
    // The fault persists across the recreate's retry — the GOP itself is bad.
    MockDecoder.globalFailNext = 2;
    const { player, events } = makePlayer({ clock: new ManualClock(), alwaysHit: false });
    player.play(T0, -1);
    for (let i = 0; i < 6; i++) await flush();

    expect(player.state).not.toBe('disabled');
    expect(events.frame.length).toBeGreaterThanOrEqual(1);
    // The first paint landed BELOW the poisoned newest GOP.
    expect(events.frame[0].epochMs).toBeLessThan(T0 - 4.5 * SAMPLE_MS);
  });

  it('disables after a run of consecutive undecodable GOPs (never skips forever)', async () => {
    MockDecoder.globalFailNext = 99; // nothing ever decodes
    const { player, events } = makePlayer({ clock: new ManualClock(), alwaysHit: false });
    player.play(T0, -1);
    for (let i = 0; i < 20; i++) await flush();

    expect(player.state).toBe('disabled');
    expect(events.disabled).toEqual(['consecutive undecodable GOPs']);
    expect(events.frame).toHaveLength(0);
  });

  it('mid-play: skips a decode-poisoned GOP and keeps playing below it (no heal-loop, no disable)', async () => {
    const clock = new ManualClock();
    const store = makeStore({ gops: 20 }); // enough runway that the run never starves
    const fetcher = new MockFetcher(store);
    MockDecoder.instances = [];
    // GOP 1 (second-newest) faults on EVERY decoder instance — poisoned data,
    // structurally decodable (gopFor is intact), so only the decode path sees it.
    const cov = store.coverage()[0];
    const gop1Top = cov.endTicks - store.epochMsToTicks(SPAN_MS);
    const gop1Bottom = cov.endTicks - store.epochMsToTicks(2 * SPAN_MS);
    const player = new ReversePlayer({
      fetcher: fetcher as unknown as BackfillFetcher,
      createDecoder: (ts) => {
        const d = new MockDecoder(ts);
        const orig = d.frameAt.getMockImplementation()!;
        d.frameAt.mockImplementation(async (run: { samples: { ticks: number }[] }) => {
          const key = run.samples[0].ticks;
          if (key >= gop1Bottom && key < gop1Top) throw new Error('poisoned GOP');
          return orig(run);
        });
        return d as unknown as GopDecoder;
      },
      clock,
    });
    const frames: number[] = [];
    const disabled: string[] = [];
    player.on('frame', (d) => frames.push((d as { epochMs: number }).epochMs));
    player.on('disabled', (r) => disabled.push(r));

    player.play(T0, -1);
    for (let i = 0; i < 40; i++) {
      clock.advance(SAMPLE_MS);
      await flush();
    }

    expect(disabled).toEqual([]);
    expect(player.state).toBe('playing');
    const gop1TopMs = store.ticksToEpochMs(gop1Top);
    const gop1BottomMs = store.ticksToEpochMs(gop1Bottom);
    // Playback continued below the poisoned GOP, and nothing inside it painted.
    expect(frames.some((ms) => ms < gop1BottomMs)).toBe(true);
    expect(frames.some((ms) => ms >= gop1BottomMs && ms < gop1TopMs)).toBe(false);
  });

  // ── Supply governor ──────────────────────────────────────────────────────

  describe('supply governor', () => {
    /** Drive `iterations` spans of wall time, delivering `gopsPerSpan` GOPs each span. */
    function deliver(
      clock: ManualClock, store: SampleStore, fetcher: MockFetcher,
      iterations: number, gopsPerSpan: number, seq: { n: number },
    ): void {
      for (let i = 0; i < iterations; i++) {
        clock.advance(SPAN_MS);
        for (let k = 0; k < gopsPerSpan; k++) appendOlderGop(store, seq.n++);
        fetcher.emit('progress', { addedSamples: 5 * gopsPerSpan });
      }
    }

    it('governs −4× down to a 2× supply after first starvation, slider untouched, and recovers to −4×', () => {
      const clock = new ManualClock();
      const store = makeStore({ gops: 60 }); // ≈10 s initial runway
      const { player, fetcher, events } = makePlayer({ store, clock });
      fetcher.state = 'collecting'; // an aim is in flight for the whole run
      const seq = { n: 1000 };

      player.play(T0, -4);
      // 2× delivery cannot carry −4×: the initial runway drains, one honest
      // buffering engages the governor, and playback settles at the supply rate.
      deliver(clock, store, fetcher, 90, 2, seq); // 15 s wall
      expect(events.state).toContain('buffering'); // starvation manifested once
      expect(player.state).toBe('playing');
      expect(player.rate).toBe(-4); // the slider never moves
      expect(player.effectiveRate).toBeGreaterThan(-4); // governed below requested

      // Equilibrium: descent tracks delivery (≈2×) over a further 5 s.
      const beforeMs = player.cursorEpochMs!;
      const beforeWall = clock.now();
      deliver(clock, store, fetcher, 30, 2, seq);
      const archivePerWall = (beforeMs - player.cursorEpochMs!) / (clock.now() - beforeWall);
      expect(archivePerWall).toBeGreaterThan(1.2);
      expect(archivePerWall).toBeLessThan(2.8);
      expect(events.autostopped).toEqual([]);

      // Delivery recovers (≈6×): the effective rate climbs back and SNAPS to requested.
      deliver(clock, store, fetcher, 60, 6, seq);
      expect(player.effectiveRate).toBe(-4);
      expect(events.autostopped).toEqual([]);
    });

    it('decays toward the floor when a governed supply dies, then buffers and autostops (still bounded)', () => {
      const clock = new ManualClock();
      const store = makeStore({ gops: 60 });
      const { player, fetcher, events } = makePlayer({ store, clock });
      fetcher.state = 'collecting';
      const seq = { n: 1000 };

      player.play(T0, -4);
      clock.advance(4_000); // drain the 10 s runway at −4× → starvation engages the governor
      expect(events.state).toContain('buffering');
      deliver(clock, store, fetcher, 60, 1, seq); // ≈1× delivery → governed run
      expect(player.state).toBe('playing');
      expect(player.effectiveRate).toBeGreaterThan(-4);
      const governedAtDeath = player.effectiveRate;

      clock.advance(120_000); // delivery dies for good

      // The rate decayed further as the runway drained…
      expect(events.governed.at(-1)!.effectiveRate).toBeGreaterThanOrEqual(governedAtDeath);
      // …and the run still terminated in bounded time.
      expect(player.state).toBe('idle');
      expect(events.autostopped).toEqual([
        expect.objectContaining({ reason: 'supply-stalled' }),
      ]);
    });

    it('resumes shallow from buffering (≈2 s runway) at a governed rate instead of hoarding the full target', () => {
      const clock = new ManualClock();
      const store = makeStore({ gops: 3 });
      const { player, fetcher } = makePlayer({ store, clock });

      player.play(T0, -1);
      clock.advance(1_000);
      expect(player.state).toBe('buffering');

      fetcher.state = 'collecting';
      for (let i = 0; i < 13; i++) appendOlderGop(store, 200 + i); // ≈2.2 s — well short of the 6 s headroom target
      fetcher.emit('progress', { addedSamples: 65 });

      expect(player.state).toBe('playing');
      expect(player.rate).toBe(-1);
      // Governed from the shallow runway: moving, but well below the slider rate.
      expect(player.effectiveRate).toBeGreaterThan(-1);
      expect(player.effectiveRate).toBeLessThan(-0.25);
    });

    it('never governs a supply that has kept up: healthy pacing emits no governed events', () => {
      const clock = new ManualClock();
      const { player, fetcher, events } = makePlayer({ clock }); // 60 GOPs ≈ 10 s
      fetcher.state = 'collecting'; // even with an aim in flight
      player.play(T0, -4);
      clock.advance(1_000); // well inside the runway
      expect(events.governed).toEqual([]);
      expect(player.effectiveRate).toBe(-4);
    });

    it('a trickling refill extends the wedge bound; the whole spell still terminates within the total bound', () => {
      const clock = new ManualClock();
      const store = makeStore({ gops: 2 });
      const { player, fetcher, events } = makePlayer({ store, clock });

      player.play(T0, -1);
      clock.advance(1_000); // drain → buffering (spell starts ≈0.33 s in)
      expect(player.state).toBe('buffering');
      fetcher.state = 'collecting';

      // Bytes trickle in every 8 s but never enough to resume: each progress
      // extends the 10 s wedge bound…
      for (let i = 0; i < 3; i++) {
        clock.advance(8_000);
        expect(player.state).toBe('buffering'); // survived past the per-spell bound
        fetcher.emit('progress', { addedSamples: 1 });
      }
      // …but the 30 s total bound still concludes the spell.
      clock.advance(8_000);
      expect(player.state).toBe('idle');
      expect(events.autostopped).toEqual([
        expect.objectContaining({ reason: 'supply-stalled' }),
      ]);
    });
  });
});
