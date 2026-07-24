// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { FrameStepper } from '../../../src/stepping/frame-stepper';
import { SampleStore } from '../../../src/stepping/sample-store';
import type { BackfillFetcher } from '../../../src/stepping/backfill-fetcher';
import type { GopDecoder } from '../../../src/stepping/gop-decoder';

// ─── Test doubles ───────────────────────────────────────────────────────────

const TIMESCALE = 15360;
const T0 = 1_780_000_000_000;

/** Real store, prefilled: two contiguous 5-sample GOPs ending at T0. */
function makeStore(opts: { gap?: boolean; codecBoundary?: boolean } = {}): SampleStore {
  const store = new SampleStore({ timescale: TIMESCALE });
  const epochA = store.registerConfig({ codec: 'avc1.420032', description: new Uint8Array([1, 0x42, 0x00, 0x32]) });
  // The older GOP is a different codec epoch when a boundary is requested —
  // stepping back from T0 crosses it (the case QA constructs).
  const epochB = opts.codecBoundary
    ? store.registerConfig({ codec: 'avc1.640028', description: new Uint8Array([1, 0x64, 0x00, 0x28]) })
    : epochA;
  const gop = (n: number) => Array.from({ length: 5 }, (_, i) => {
    const dts = n * 5 * 512 + i * 512;
    return {
      dts, pts: dts, duration: 512, key: i === 0,
      bytes: new Uint8Array(100),
    };
  });
  // Two windows; archive-adjacent unless a gap is requested. Each anchor
  // maps its own fragment's baseDts onto the target archive position.
  const gapMs = opts.gap ? 500 : 0;
  const spanMs = (5 * 512 * 1000) / TIMESCALE; // ≈166.7 ms per GOP
  store.insertFragment(
    { seq: 1, trackId: 1, baseDts: 0, samples: gop(0) },
    { timestampMs: T0 - spanMs, rtpTimestamp: 0 },
    epochA,
  );
  store.insertFragment(
    { seq: 2, trackId: 1, baseDts: 5 * 512, samples: gop(1) },
    { timestampMs: T0 - 2 * spanMs - gapMs, rtpTimestamp: 5 * 512 },
    epochB,
  );
  return store;
}

class MockFetcher {
  private emitter = new EventTarget();
  store: SampleStore | null;
  init = {
    tracks: [], encrypted: false,
    videoTrack: {
      id: 1, handler: 'vide', timescale: TIMESCALE, sampleEntry: 'avc1',
      decoderConfig: new Uint8Array([1, 2, 3]), hasEditList: false,
    },
  };
  mime = 'video/mp4; codecs="avc1.420032"';
  state = 'paused';
  stitchConflicts = 0;
  probing = false;
  currentAskMs: number | null = null;

  openWindow = vi.fn().mockResolvedValue(undefined);
  openAtAnchor = vi.fn().mockResolvedValue(undefined);
  extendBack = vi.fn().mockResolvedValue(undefined);
  refetchHole = vi.fn().mockReturnValue(true);
  pauseDelivery = vi.fn();

  constructor(store: SampleStore | null) {
    this.store = store;
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

interface FakeFrame { ticks: number }

class MockDecoder {
  static instances: MockDecoder[] = [];
  /**
   * Shared across instances: the stepper's failure response is
   * dispose-and-recreate, so persistent faults (a genuinely undecodable
   * stream) must survive into the next factory-made decoder.
   */
  static globalFailNext = 0;
  failed = false;
  disposed = false;

  /** Decoded-run cache model, mirroring the real GopDecoder semantics. */
  private decodedTicks = new Set<number>();

  frameAt = vi.fn().mockImplementation(async (run: { samples: { ticks: number }[]; targetIndex: number }) => {
    if (MockDecoder.globalFailNext > 0) {
      MockDecoder.globalFailNext--;
      this.failed = true;
      throw new Error('decode fault');
    }
    for (const s of run.samples) this.decodedTicks.add(s.ticks);
    return { ticks: run.samples[run.targetIndex].ticks } as FakeFrame;
  });
  cachedFrame = vi.fn().mockImplementation((ticks: number) =>
    this.decodedTicks.has(ticks) ? ({ ticks } as FakeFrame) : null,
  );
  trimAbove = vi.fn();
  dispose = vi.fn().mockImplementation(() => {
    this.disposed = true;
  });

  constructor(public timescale: number) {
    MockDecoder.instances.push(this);
  }
}

function makeStepper(store: SampleStore | null = makeStore()) {
  MockDecoder.instances = [];
  const fetcher = new MockFetcher(store);
  const stepper = new FrameStepper({
    fetcher: fetcher as unknown as BackfillFetcher,
    createDecoder: (timescale) => new MockDecoder(timescale) as unknown as GopDecoder,
  });
  const events: Record<string, unknown[]> = {
    frame: [], loading: [], exitforward: [], noearlierframe: [], disabled: [],
  };
  for (const name of Object.keys(events)) {
    stepper.on(name as never, ((detail: unknown) => {
      events[name].push(detail);
    }) as never);
  }
  return { stepper, fetcher, events };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

const msOf = (store: SampleStore, ticks: number) => store.ticksToEpochMs(ticks);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FrameStepper', () => {
  beforeEach(() => {
    MockDecoder.instances = [];
    MockDecoder.globalFailNext = 0;
  });

  it('an idle stepper ignores fetcher stalls (shared-fetcher safety for a concurrent reverse owner)', () => {
    const { stepper, fetcher } = makeStepper();
    // Never entered stepping — idle, but still subscribed to the shared fetcher.
    expect(stepper.state).toBe('idle');

    // Enough stalls to trip the background-stall bound (3) were it not guarded.
    fetcher.state = 'collecting';
    fetcher.emit('stalled');
    fetcher.emit('stalled');
    fetcher.emit('stalled');
    fetcher.emit('stalled');

    // A concurrent owner's delivery is left untouched.
    expect(fetcher.pauseDelivery).not.toHaveBeenCalled();
    expect(stepper.state).toBe('idle');
  });

  it('an exited stepper ignores fetcher stalls (delivery belongs to whoever re-aimed)', async () => {
    const { stepper, fetcher } = makeStepper();
    stepper.enterStepping(T0);
    stepper.stepPrev();
    await flush();
    stepper.exit();
    fetcher.pauseDelivery.mockClear();

    fetcher.state = 'collecting';
    fetcher.emit('stalled');
    fetcher.emit('stalled');
    fetcher.emit('stalled');

    expect(fetcher.pauseDelivery).not.toHaveBeenCalled();
    expect(stepper.state).toBe('idle');
  });

  it('enterStepping aims the entry fetch at the anchor (governing GOP, not a forward window)', () => {
    const { stepper, fetcher } = makeStepper();

    stepper.enterStepping(T0);

    expect(stepper.state).toBe('stepping');
    expect(fetcher.openAtAnchor).toHaveBeenCalledWith(T0);
    expect(fetcher.openWindow).not.toHaveBeenCalled();
  });

  it('builds the backward runway proactively when the entry GOP completes', () => {
    const { stepper, fetcher } = makeStepper();
    stepper.enterStepping(T0);

    // The entry GOP lands; with only ~one GOP of headroom the stepper
    // pre-extends backward so stepping back does not stall at the GOP edge.
    fetcher.emit('windowcomplete');
    expect(fetcher.extendBack).toHaveBeenCalled();
  });

  it('does not pre-extend while the fetcher is opening (a re-aim tears down the connect)', async () => {
    const { stepper, fetcher, events } = makeStepper();
    fetcher.state = 'opening';
    stepper.enterStepping(T0);

    stepper.stepPrev();
    await flush();

    expect(events.frame).toHaveLength(1); // stepping itself unaffected
    expect(fetcher.extendBack).not.toHaveBeenCalled();
  });

  it('backs off proactive extension when the previous extend produced no backward growth', () => {
    const { stepper, fetcher } = makeStepper();
    const store = fetcher.store!;
    stepper.enterStepping(T0);

    fetcher.emit('windowcomplete');
    expect(fetcher.extendBack).toHaveBeenCalledTimes(1);

    // The aim completed without backward growth — an immediate re-aim would
    // just bump the generation and drop in-flight delivery again.
    fetcher.emit('windowcomplete');
    expect(fetcher.extendBack).toHaveBeenCalledTimes(1);

    // Real backward growth re-arms proactive extension.
    const spanMs = (5 * 512 * 1000) / TIMESCALE;
    store.insertFragment(
      {
        seq: 3, trackId: 1, baseDts: 10 * 512,
        samples: Array.from({ length: 5 }, (_, i) => ({
          dts: 10 * 512 + i * 512, pts: 10 * 512 + i * 512,
          duration: 512, key: i === 0, bytes: new Uint8Array(100),
        })),
      },
      { timestampMs: T0 - 3 * spanMs, rtpTimestamp: 10 * 512 },
      0,
    );
    fetcher.emit('windowcomplete');
    expect(fetcher.extendBack).toHaveBeenCalledTimes(2);
  });

  it('measures runway from the cursor\'s own interval, not a detached older island', () => {
    const { stepper, fetcher } = makeStepper();
    const store = fetcher.store!;
    // A detached island a minute below the cursor's interval: global
    // coverage reaches far back, but the local runway is ~333 ms.
    store.insertFragment(
      {
        seq: 9, trackId: 1, baseDts: 100 * 512,
        samples: Array.from({ length: 5 }, (_, i) => ({
          dts: 100 * 512 + i * 512, pts: 100 * 512 + i * 512,
          duration: 512, key: i === 0, bytes: new Uint8Array(100),
        })),
      },
      { timestampMs: T0 - 60_000, rtpTimestamp: 100 * 512 },
      0,
    );
    stepper.enterStepping(T0);

    fetcher.emit('windowcomplete');
    expect(fetcher.extendBack).toHaveBeenCalled();
  });

  it('aims at the cursor, not the distant floor, when the cursor sits below all coverage', async () => {
    const { stepper, fetcher } = makeStepper();
    stepper.enterStepping(T0);

    // Scrub-while-paused far below the covered region; the new anchor's
    // entry GOP has not landed, so the store still holds only the T0 island.
    stepper.reanchor(T0 - 60_000);
    fetcher.openAtAnchor.mockClear();

    stepper.stepPrev();
    await flush();

    // Extending would only march the T0 island backward one window per pass
    // (superseding the entry aim each time) — the step must re-aim instead.
    expect(fetcher.extendBack).not.toHaveBeenCalled();
    expect(fetcher.openAtAnchor).toHaveBeenCalledTimes(1);
    const aimedMs = fetcher.openAtAnchor.mock.calls[0][0] as number;
    expect(Math.abs(aimedMs - (T0 - 60_000))).toBeLessThan(1);
  });

  it('waits for an in-flight aim at the cursor instead of superseding it, then replays the step', async () => {
    const { stepper, fetcher, events } = makeStepper();
    const store = fetcher.store!;
    stepper.enterStepping(T0);

    stepper.reanchor(T0 - 60_000);
    fetcher.openAtAnchor.mockClear();
    // The re-anchor's entry aim is still collecting toward the new cursor.
    fetcher.state = 'collecting';
    fetcher.currentAskMs = T0 - 60_000;

    stepper.stepPrev();
    await flush();

    // Superseding the live aim would drop its delivery; a paused re-seek to
    // the held position may draw nothing fresh — the step must wait.
    expect(fetcher.openAtAnchor).not.toHaveBeenCalled();
    expect(fetcher.extendBack).not.toHaveBeenCalled();

    // The entry GOP lands and the aim completes: the queued step replays.
    const spanMs = (5 * 512 * 1000) / TIMESCALE;
    store.insertFragment(
      {
        seq: 3, trackId: 1, baseDts: 50 * 512,
        samples: Array.from({ length: 5 }, (_, i) => ({
          dts: 50 * 512 + i * 512, pts: 50 * 512 + i * 512,
          duration: 512, key: i === 0, bytes: new Uint8Array(100),
        })),
      },
      { timestampMs: T0 - 60_000 - spanMs, rtpTimestamp: 50 * 512 },
      0,
    );
    fetcher.state = 'paused';
    fetcher.currentAskMs = null;
    fetcher.emit('windowcomplete');
    await flush();

    expect(events.frame).toHaveLength(1);
    const painted = events.frame[0] as { epochMs: number };
    expect(painted.epochMs).toBeLessThan(T0 - 60_000);
    expect(painted.epochMs).toBeGreaterThan(T0 - 60_000 - spanMs - 1);
  });

  it('stands proactive maintenance down while the cursor sits below all coverage', () => {
    const { stepper, fetcher } = makeStepper();
    stepper.enterStepping(T0 - 60_000);

    fetcher.emit('windowcomplete');

    expect(fetcher.extendBack).not.toHaveBeenCalled();
  });

  it('stepPrev paints the actual previous sample and walks backward', async () => {
    const { stepper, fetcher, events } = makeStepper();
    const store = fetcher.store!;
    stepper.enterStepping(T0);

    stepper.stepPrev();
    await flush();
    expect(events.frame).toHaveLength(1);
    const first = events.frame[0] as { epochMs: number; frame: FakeFrame };
    // Greatest sample strictly below T0 — the last sample of GOP 2.
    const expected = store.prevSample(store.epochMsToTicks(T0))!;
    expect(first.epochMs).toBeCloseTo(msOf(store, expected.ticks), 3);

    stepper.stepPrev();
    await flush();
    expect(events.frame).toHaveLength(2);
    const second = events.frame[1] as { epochMs: number };
    expect(second.epochMs).toBeLessThan(first.epochMs);
    expect(stepper.cursorEpochMs).toBeCloseTo(second.epochMs, 3);

    // The decoder was fed a key-led run.
    const decoder = MockDecoder.instances[0];
    const run = decoder.frameAt.mock.calls[0][0];
    expect(run.samples[0].key).toBe(true);
  });

  it('stepNext returns toward the entry; past it → exitforward', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);

    stepper.stepPrev();
    await flush();
    stepper.stepPrev();
    await flush();
    expect(events.frame).toHaveLength(2);

    stepper.stepNext();
    await flush();
    expect(events.frame).toHaveLength(3);
    expect((events.frame[2] as { epochMs: number }).epochMs)
      .toBeGreaterThan((events.frame[1] as { epochMs: number }).epochMs);

    // The cursor is now back at the newest stepped sample; the next
    // forward step would pass the entry anchor.
    stepper.stepNext();
    await flush();
    expect(events.exitforward).toHaveLength(1);
    expect(events.frame).toHaveLength(3);
    expect(fetcher.refetchHole).not.toHaveBeenCalled();
  });

  it('extends coverage when stepping past the oldest buffered sample', async () => {
    const { stepper, fetcher, events } = makeStepper();
    const store = fetcher.store!;
    stepper.enterStepping(T0);

    for (let i = 0; i < 10; i++) {
      stepper.stepPrev();
      await flush();
    }
    expect(events.frame).toHaveLength(10);

    fetcher.extendBack.mockClear();
    stepper.stepPrev(); // nothing older buffered
    await flush();
    expect(stepper.state).toBe('loading');
    expect(events.loading).toContain(true);
    expect(fetcher.extendBack).toHaveBeenCalled();

    // New coverage arrives: one more GOP further back.
    const spanMs = (5 * 512 * 1000) / TIMESCALE;
    store.insertFragment(
      {
        seq: 3, trackId: 1, baseDts: 10 * 512,
        samples: Array.from({ length: 5 }, (_, i) => ({
          dts: 10 * 512 + i * 512, pts: 10 * 512 + i * 512,
          duration: 512, key: i === 0, bytes: new Uint8Array(100),
        })),
      },
      { timestampMs: T0 - 3 * spanMs, rtpTimestamp: 10 * 512 },
      0,
    );
    fetcher.emit('progress', { addedSamples: 5 });
    await flush();

    // The pending step replayed and painted.
    expect(events.frame).toHaveLength(11);
    expect(stepper.state).toBe('stepping');
    expect(events.loading).toContain(false);
  });

  it('treats a non-contiguous candidate as a hole: loading + targeted refetch', async () => {
    const { stepper, fetcher, events } = makeStepper(makeStore({ gap: true }));
    stepper.enterStepping(T0);

    // Step through GOP 2 (5 samples) to its first sample…
    for (let i = 0; i < 5; i++) {
      stepper.stepPrev();
      await flush();
    }
    expect(events.frame).toHaveLength(5);

    // …the next candidate is across the gap.
    stepper.stepPrev();
    await flush();
    expect(stepper.state).toBe('loading');
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(1);
    expect(events.frame).toHaveLength(5); // no silent skip
  });

  it('coalesces step requests while loading', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);

    for (let i = 0; i < 10; i++) {
      stepper.stepPrev();
      await flush();
    }
    stepper.stepPrev(); // → loading (out of coverage)
    await flush();
    const framesBefore = events.frame.length;

    stepper.stepPrev();
    stepper.stepPrev();
    stepper.stepNext(); // latest wins
    fetcher.emit('progress', { addedSamples: 0 });
    await flush();

    // Exactly one replayed step (stepNext from the oldest sample).
    expect(events.frame.length).toBe(framesBefore + 1);
  });

  it('recreates the decoder after one failure, disables after two', async () => {
    const { stepper, events } = makeStepper();
    stepper.enterStepping(T0);

    stepper.stepPrev();
    await flush();
    expect(MockDecoder.instances).toHaveLength(1);

    // One fault: recreate + retry transparently.
    MockDecoder.globalFailNext = 1;
    stepper.stepPrev();
    await flush();
    await flush();
    expect(MockDecoder.instances).toHaveLength(2);
    expect(events.frame).toHaveLength(2);
    expect(stepper.state).toBe('stepping');

    // A persistent fault (fails across the recreate too): disabled.
    MockDecoder.globalFailNext = 2;
    stepper.stepPrev();
    await flush();
    await flush();
    await flush();
    expect(stepper.state).toBe('disabled');
    expect(events.disabled).toEqual(['decoder failed twice']);
    expect(MockDecoder.instances.at(-1)!.dispose).toHaveBeenCalled();
    // Further steps are ignored.
    stepper.stepPrev();
    await flush();
    expect(events.frame).toHaveLength(2);
  });

  it('disables on fetcher unsupported and quiesces delivery', () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);
    fetcher.emit('unsupported', 'cenc');
    expect(stepper.state).toBe('disabled');
    expect(events.disabled).toEqual(['fetcher: cenc']);
    // A dead feature must not keep the session streaming/inserting.
    expect(fetcher.pauseDelivery).toHaveBeenCalled();
  });

  it('sessionlost triggers one bounded rebuild at the cursor; only a consecutive loss disables', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);
    stepper.stepPrev();
    await flush();
    const cursorMs = stepper.cursorEpochMs!;
    fetcher.openAtAnchor.mockClear();

    // First loss: rebuild — re-aiming at the cursor builds a fresh session.
    fetcher.emit('sessionlost');
    expect(stepper.state).toBe('stepping');
    expect(events.disabled).toHaveLength(0);
    expect(fetcher.openAtAnchor).toHaveBeenCalledTimes(1);
    expect(fetcher.openAtAnchor).toHaveBeenCalledWith(cursorMs);

    // Healthy delivery clears the loss ladder…
    fetcher.emit('progress', { addedSamples: 5 });
    await flush();

    // …so a later loss rebuilds again instead of disabling.
    fetcher.emit('sessionlost');
    expect(stepper.state).toBe('stepping');
    expect(fetcher.openAtAnchor).toHaveBeenCalledTimes(2);

    // A second consecutive loss (dead server): clean exit, fetcher quiesced.
    fetcher.emit('sessionlost');
    expect(stepper.state).toBe('disabled');
    expect(events.disabled).toEqual(['fetch session lost']);
    expect(fetcher.pauseDelivery).toHaveBeenCalled();
  });

  it('landingfailed is recoverable once; persistent misses end as a boundary, never disable (§10)', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);

    // Drive into loading (no coverage older than the oldest sample).
    for (let i = 0; i < 10; i++) {
      stepper.stepPrev();
      await flush();
    }
    stepper.stepPrev();
    await flush();
    expect(stepper.state).toBe('loading');

    // First abandoned window: back to plain stepping, not disabled.
    fetcher.emit('landingfailed');
    expect(stepper.state).toBe('stepping');
    expect(events.disabled).toHaveLength(0);
    expect(events.loading.at(-1)).toBe(false);

    // The user clicks again; the second abandoned wait concludes an honest
    // boundary — server mis-positioning alone never disables stepping.
    stepper.stepPrev();
    await flush();
    expect(stepper.state).toBe('loading');
    fetcher.emit('landingfailed');
    expect(stepper.state).toBe('stepping');
    expect(events.disabled).toHaveLength(0);
    expect(events.noearlierframe).toHaveLength(1);

    // Within-runway stepping keeps working for the rest of the pause.
    stepper.stepNext();
    await flush();
    expect(events.frame).toHaveLength(11);
  });

  it('a successful paint resets the landing-failure strikes', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);
    for (let i = 0; i < 10; i++) {
      stepper.stepPrev();
      await flush();
    }
    stepper.stepPrev(); // waiting on extendBack
    await flush();
    fetcher.emit('landingfailed'); // strike 1 → wait abandoned
    expect(stepper.state).toBe('stepping');

    // Paints reset the ladder…
    stepper.stepNext();
    await flush();
    stepper.stepPrev();
    await flush();
    expect(events.frame).toHaveLength(12);

    // …so the next abandoned wait counts as strike 1 again, not a boundary.
    stepper.stepPrev();
    await flush();
    expect(stepper.state).toBe('loading');
    fetcher.emit('landingfailed');
    expect(stepper.state).toBe('stepping');
    expect(events.noearlierframe).toHaveLength(0);
    expect(events.disabled).toHaveLength(0);
  });

  it('a stalled hole probe verifies the gap as empty and steps across honestly', async () => {
    const { stepper, fetcher, events } = makeStepper(makeStore({ gap: true }));
    const store = fetcher.store!;
    stepper.enterStepping(T0);

    for (let i = 0; i < 5; i++) {
      stepper.stepPrev();
      await flush();
    }
    // Cursor at the gap's upper edge; candidate across the gap.
    stepper.stepPrev();
    await flush();
    expect(stepper.state).toBe('loading');
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(1);
    // Probe aimed inside the gap, not at either covered edge.
    const probeMs = fetcher.refetchHole.mock.calls[0][0] as number;
    const cursorMs = store.ticksToEpochMs(store.epochMsToTicks(T0)); // T0 domain sanity
    expect(probeMs).toBeLessThan(cursorMs);

    // The probe stalls — nothing recorded in the gap.
    fetcher.emit('stalled');
    await flush();

    // The candidate across the gap is the true adjacent frame: painted.
    expect(events.frame).toHaveLength(6);
    expect(stepper.state).toBe('stepping');
  });

  it('repeated stalls on a user wait abandon it honestly (never wedge in loading, never disable)', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);

    for (let i = 0; i < 10; i++) {
      stepper.stepPrev();
      await flush();
    }
    stepper.stepPrev(); // out of coverage → loading via extendBack
    await flush();
    expect(stepper.state).toBe('loading');

    fetcher.emit('stalled');
    fetcher.emit('stalled');
    expect(stepper.state).toBe('loading');
    fetcher.emit('stalled');
    expect(stepper.state).toBe('stepping');
    expect(events.loading.at(-1)).toBe(false);
    expect(events.disabled).toHaveLength(0);
  });

  it('archive start: a redelivered duplicate GOP then stalls end the wait gracefully, never disable', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);
    for (let i = 0; i < 10; i++) {
      stepper.stepPrev();
      await flush();
    }
    const cursorBefore = stepper.cursorEpochMs;

    stepper.stepPrev(); // nothing older buffered — extendBack aims
    await flush();
    expect(stepper.state).toBe('loading');

    // The server lands at the archive start and re-delivers the same GOP:
    // all dupes, zero progress events — then goes silent. The wait ends
    // gracefully at the same cursor; stepping itself stays alive.
    fetcher.emit('stalled');
    fetcher.emit('stalled');
    fetcher.emit('stalled');
    expect(stepper.state).toBe('stepping');
    expect(events.loading.at(-1)).toBe(false);
    expect(events.disabled).toHaveLength(0);
    expect(stepper.cursorEpochMs).toBe(cursorBefore);

    // Within-runway stepping still works for the whole pause.
    stepper.stepNext();
    await flush();
    expect(events.frame).toHaveLength(11);
  });

  it('stalls during decode-driven loading never strike (background-aim attribution)', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);
    stepper.stepPrev();
    await flush();
    expect(events.frame).toHaveLength(1);

    const decoder = MockDecoder.instances[0];
    let release!: (f: FakeFrame) => void;
    decoder.cachedFrame.mockReturnValueOnce(null);
    decoder.frameAt.mockImplementationOnce(
      () => new Promise<FakeFrame>((r) => { release = r; }),
    );
    stepper.stepPrev(); // decode-driven loading (no fetch wait)
    await flush();
    expect(stepper.state).toBe('loading');

    // A background aim stalls while the decode is in flight — not the
    // user's wait, so it must neither strike nor end the loading.
    fetcher.emit('stalled');
    fetcher.emit('stalled');
    fetcher.emit('stalled');
    fetcher.emit('stalled');
    expect(stepper.state).toBe('loading');
    expect(events.disabled).toHaveLength(0);

    release({ ticks: 0 });
    await flush();
    expect(events.frame).toHaveLength(2);
    expect(stepper.state).toBe('stepping');
  });

  it('serves within-GOP backward steps from cache without a loading flash', async () => {
    const { stepper, events } = makeStepper();
    stepper.enterStepping(T0);

    stepper.stepPrev(); // cold: decodes the GOP
    await flush();
    expect(events.loading).toEqual([true, false]);

    stepper.stepPrev(); // warm: same GOP, cached
    await flush();
    expect(events.frame).toHaveLength(2);
    // No additional loading transitions for the cache hit.
    expect(events.loading).toEqual([true, false]);
  });

  it('pre-decodes the previous GOP when the cursor enters the lower third', async () => {
    const { stepper, fetcher } = makeStepper();
    const oldestGopStart = fetcher.store!.coverage()[0].startTicks;
    stepper.enterStepping(T0);

    // Step to the newest GOP's second sample (index 1 of 5 → in the lower third).
    for (let i = 0; i < 4; i++) {
      stepper.stepPrev();
      await flush();
    }
    // Beyond the user-step runs, a speculative run starting at the OLDER
    // GOP's keyframe must have been requested.
    const decoder = MockDecoder.instances[0];
    const runs = decoder.frameAt.mock.calls.map((c) => c[0] as { samples: { ticks: number }[] });
    expect(runs.some((r) => Math.abs(r.samples[0].ticks - oldestGopStart) < 1)).toBe(true);
  });

  it('disables cleanly when no decoder configuration is available', async () => {
    // Codec config now rides each run; the stepper only needs the container
    // timescale, so the disable trigger is a missing video track.
    const { stepper, fetcher, events } = makeStepper();
    (fetcher as { init: unknown }).init = { tracks: [], encrypted: false, videoTrack: null };
    stepper.enterStepping(T0);
    stepper.stepPrev();
    await flush();
    expect(stepper.state).toBe('disabled');
    expect(events.disabled[0] as string).toMatch(/decoder configuration/);
  });

  it('steps across a codec boundary without disabling (§6.3)', async () => {
    // The store hands each run its own config and the decoder reconfigures
    // internally, so crossing the codec boundary keeps painting — never a
    // drop to plain video.
    const { stepper, events } = makeStepper(makeStore({ codecBoundary: true }));
    stepper.enterStepping(T0);

    // Walk back through both GOPs, crossing the boundary mid-way.
    for (let i = 0; i < 9; i++) {
      stepper.stepPrev();
      await flush();
    }

    expect(events.frame).toHaveLength(9);
    expect(events.disabled).toHaveLength(0);
    expect(stepper.state).toBe('stepping');
  });

  it('rebinds the entry anchor from ms to ticks once the store is ready (pause-from-live)', async () => {
    // Pause-from-live: entering before the fetch session has a store, the
    // anchor is provisional (ms) until `ready` rebinds it to ticks.
    const { stepper, fetcher } = makeStepper(null);
    stepper.enterStepping(T0);
    expect(stepper.state).toBe('stepping');
    expect(stepper.cursorEpochMs).toBeNull(); // no store yet

    fetcher.store = makeStore();
    fetcher.emit('ready');

    // Rebound: the cursor now resolves to the entry archive time.
    expect(stepper.cursorEpochMs).toBeCloseTo(T0, 3);
  });

  it('disables when a hole cannot be aimed (refetch and openWindow both fail)', async () => {
    const { stepper, fetcher, events } = makeStepper(makeStore({ gap: true }));
    fetcher.refetchHole.mockReturnValue(false);
    fetcher.openWindow.mockRejectedValue(new Error('no session'));
    stepper.enterStepping(T0);

    // Step through GOP 2 to its keyframe, then across the gap.
    for (let i = 0; i < 6; i++) {
      stepper.stepPrev();
      await flush();
    }

    expect(stepper.state).toBe('disabled');
    expect(events.disabled).toEqual(['cannot aim fetch window']);
  });

  it('no-keyframe refetch that cannot be aimed falls back to openWindow', async () => {
    const store = makeStore();
    const { stepper, fetcher } = makeStepper(store);
    stepper.enterStepping(T0);
    await flush();
    // Covered target whose governing keyframe is not contiguously present,
    // at a moment the session cannot take a warm re-seek.
    vi.spyOn(store, 'gopFor').mockReturnValue(null);
    fetcher.refetchHole.mockReturnValue(false);

    stepper.stepPrev();
    await flush();

    expect(stepper.state).toBe('loading');
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(1);
    expect(fetcher.openWindow).toHaveBeenCalledTimes(1);
    expect(fetcher.openWindow.mock.calls[0][0]).toBeCloseTo(
      fetcher.refetchHole.mock.calls[0][0] as number,
      3,
    );
  });

  it('disables when the no-keyframe fallback window cannot be aimed either', async () => {
    const store = makeStore();
    const { stepper, fetcher, events } = makeStepper(store);
    stepper.enterStepping(T0);
    await flush();
    vi.spyOn(store, 'gopFor').mockReturnValue(null);
    fetcher.refetchHole.mockReturnValue(false);
    fetcher.openWindow.mockRejectedValue(new Error('no session'));

    stepper.stepPrev();
    await flush();

    expect(stepper.state).toBe('disabled');
    expect(events.disabled).toEqual(['cannot aim fetch window']);
  });

  it('exit() lands on plain paused video: decoder gone, delivery paused', async () => {
    const { stepper, fetcher } = makeStepper();
    stepper.enterStepping(T0);
    stepper.stepPrev();
    await flush();
    const decoder = MockDecoder.instances[0];

    stepper.exit();

    expect(decoder.dispose).toHaveBeenCalled();
    expect(fetcher.pauseDelivery).toHaveBeenCalled();
    expect(stepper.state).toBe('idle');
    expect(stepper.cursorEpochMs).toBeNull();
  });

  it('a stale decode completion never paints after exit', async () => {
    const { stepper, events } = makeStepper();
    stepper.enterStepping(T0);

    // Make the decode hang until we release it.
    let release!: (f: FakeFrame) => void;
    stepper.stepPrev();
    await flush();
    const decoder = MockDecoder.instances[0];
    decoder.frameAt.mockImplementationOnce(
      () => new Promise<FakeFrame>((r) => { release = r; }),
    );

    stepper.stepPrev(); // hangs in decode
    await flush();
    stepper.exit();
    release({ ticks: 0 });
    await flush();

    // Only the first step's frame was ever emitted.
    expect(events.frame).toHaveLength(1);
    expect(stepper.state).toBe('idle');
  });

  it('reanchor() preserves a click queued during loading and replays it at the new anchor', async () => {
    const { stepper, fetcher, events } = makeStepper();
    const store = fetcher.store!;
    stepper.enterStepping(T0);
    for (let i = 0; i < 10; i++) {
      stepper.stepPrev();
      await flush();
    }
    stepper.stepPrev(); // out of coverage → loading with a queued click
    await flush();
    expect(stepper.state).toBe('loading');

    const newAnchorMs = T0 - 50;
    stepper.reanchor(newAnchorMs);
    expect(fetcher.openAtAnchor).toHaveBeenLastCalledWith(newAnchorMs);
    // The carried click is still in flight — never swallowed by the re-anchor.
    expect(stepper.state).toBe('loading');

    // The new anchor's data lands → the carried click replays there.
    fetcher.emit('progress', { addedSamples: 5 });
    await flush();

    expect(events.frame).toHaveLength(11);
    const expected = store.prevSample(store.epochMsToTicks(newAnchorMs))!;
    expect((events.frame.at(-1) as { epochMs: number }).epochMs)
      .toBeCloseTo(msOf(store, expected.ticks), 1);
    expect(stepper.state).toBe('stepping');
  });

  it('reanchor() without a queued click re-aims warm and waits for the next click', () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);

    stepper.reanchor(T0 - 80);

    expect(fetcher.openAtAnchor).toHaveBeenLastCalledWith(T0 - 80);
    expect(stepper.state).toBe('stepping');
    expect(stepper.cursorEpochMs).toBeCloseTo(T0 - 80, 1);
    expect(events.frame).toHaveLength(0);
    expect(events.loading).toHaveLength(0);
  });

  it('reanchor during the entry connect parks the target and applies it on ready', async () => {
    const { stepper, fetcher, events } = makeStepper(null); // cold: no store yet
    fetcher.state = 'opening';
    stepper.enterStepping(T0);
    expect(fetcher.openAtAnchor).toHaveBeenCalledTimes(1);

    stepper.stepPrev(); // queued: no store → loading
    await flush();
    expect(stepper.state).toBe('loading');

    stepper.reanchor(T0 - 80);
    // Parked — the in-flight connect is not torn down or re-aimed.
    expect(fetcher.openAtAnchor).toHaveBeenCalledTimes(1);
    expect(fetcher.pauseDelivery).not.toHaveBeenCalled();

    // Connect resolves: init parsed → ready.
    fetcher.store = makeStore();
    fetcher.state = 'collecting';
    fetcher.emit('ready');
    await flush(); // applied on a microtask (never mid-parse)

    expect(fetcher.openAtAnchor).toHaveBeenCalledTimes(2);
    expect(fetcher.openAtAnchor).toHaveBeenLastCalledWith(T0 - 80);

    // The queued click replays at the new anchor once its data lands.
    fetcher.emit('progress', { addedSamples: 5 });
    await flush();
    expect(events.frame).toHaveLength(1);
    const store = fetcher.store!;
    const expected = store.prevSample(store.epochMsToTicks(T0 - 80))!;
    expect((events.frame[0] as { epochMs: number }).epochMs)
      .toBeCloseTo(msOf(store, expected.ticks), 1);
  });

  it('exit() clears a parked re-anchor (a later ready does not re-aim)', async () => {
    const { stepper, fetcher } = makeStepper(null);
    fetcher.state = 'opening';
    stepper.enterStepping(T0);
    stepper.reanchor(T0 - 80);

    stepper.exit();
    fetcher.store = makeStore();
    fetcher.state = 'collecting';
    fetcher.emit('ready');
    await flush();

    expect(fetcher.openAtAnchor).toHaveBeenCalledTimes(1); // only the entry aim
    expect(stepper.state).toBe('idle');
  });

  it('background extend mis-landings never strike: stepping survives and serves the runway', async () => {
    // The prewarm's proactive extends mis-land repeatedly on a degraded
    // server with ZERO clicks queued — that must not walk any terminal ladder.
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);

    fetcher.emit('landingfailed');
    fetcher.emit('landingfailed');
    expect(stepper.state).toBe('stepping');
    expect(events.disabled).toHaveLength(0);

    // Proactive extension backs off against the mis-positioning server…
    fetcher.extendBack.mockClear();
    fetcher.emit('windowcomplete');
    expect(fetcher.extendBack).not.toHaveBeenCalled();

    // …but the user's click still paints from the already-fetched runway.
    stepper.stepPrev();
    await flush();
    expect(events.frame).toHaveLength(1);
    expect(stepper.state).toBe('stepping');
  });

  it('caps zero-growth extendBack cycles: two completions without backward growth conclude the boundary', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);
    for (let i = 0; i < 10; i++) {
      stepper.stepPrev();
      await flush();
    }
    fetcher.extendBack.mockClear();

    stepper.stepPrev(); // nothing older → extendBack aim 1
    await flush();
    expect(fetcher.extendBack).toHaveBeenCalledTimes(1);

    // The aim completes with zero backward growth (server clamps onto
    // covered data, all dupes) — one bounded retry re-aims…
    fetcher.emit('windowcomplete');
    await flush();
    expect(fetcher.extendBack).toHaveBeenCalledTimes(2);
    expect(stepper.state).toBe('loading');

    // …and the second zero-growth completion concludes the boundary
    // instead of churning forever.
    fetcher.emit('windowcomplete');
    await flush();
    expect(stepper.state).toBe('stepping');
    expect(events.noearlierframe).toHaveLength(1);
    expect(events.loading.at(-1)).toBe(false);
    expect(events.disabled).toHaveLength(0);

    // Further prev clicks at the boundary are honest no-ops — no new aims,
    // no cursor move, no loading flash.
    const cursorBefore = stepper.cursorEpochMs;
    stepper.stepPrev();
    await flush();
    expect(fetcher.extendBack).toHaveBeenCalledTimes(2);
    expect(events.noearlierframe).toHaveLength(2);
    expect(stepper.state).toBe('stepping');
    expect(stepper.cursorEpochMs).toBe(cursorBefore);
  });

  it('fetcher noearlierdata ends the wait as a boundary and stepping stays alive', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);
    for (let i = 0; i < 10; i++) {
      stepper.stepPrev();
      await flush();
    }
    stepper.stepPrev(); // waiting on extendBack
    await flush();
    expect(stepper.state).toBe('loading');

    fetcher.extendBack.mockClear();
    fetcher.emit('noearlierdata');
    expect(stepper.state).toBe('stepping');
    expect(events.noearlierframe).toHaveLength(1);
    expect(events.loading.at(-1)).toBe(false);
    expect(events.disabled).toHaveLength(0);

    // The boundary is remembered: the next prev click declines immediately.
    stepper.stepPrev();
    await flush();
    expect(fetcher.extendBack).not.toHaveBeenCalled();
    expect(events.noearlierframe).toHaveLength(2);

    // Forward stepping within the runway is unaffected.
    stepper.stepNext();
    await flush();
    expect(events.frame).toHaveLength(11);
  });

  it('unrelated progress does not clear an in-flight hole probe', async () => {
    const { stepper, fetcher, events } = makeStepper(makeStore({ gap: true }));
    const store = fetcher.store!;
    stepper.enterStepping(T0);
    for (let i = 0; i < 5; i++) {
      stepper.stepPrev();
      await flush();
    }

    stepper.stepPrev(); // across the gap → hole probe
    await flush();
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(1);

    // A background fill lands far below the gap — unrelated to the probe.
    store.insertFragment(
      {
        seq: 7, trackId: 1, baseDts: 50 * 512,
        samples: Array.from({ length: 5 }, (_, i) => ({
          dts: 50 * 512 + i * 512, pts: 50 * 512 + i * 512,
          duration: 512, key: i === 0, bytes: new Uint8Array(100),
        })),
      },
      { timestampMs: T0 - 60_000, rtpTimestamp: 50 * 512 },
      0,
    );
    fetcher.emit('progress', { addedSamples: 5 });
    await flush();
    // The probe was not restarted and the wait stays put.
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(1);
    expect(stepper.state).toBe('loading');

    // The stalled probe then verifies the gap and the step crosses honestly.
    fetcher.emit('stalled');
    await flush();
    expect(events.frame).toHaveLength(6);
    expect(stepper.state).toBe('stepping');
  });

  it('coverage landing inside the gap invalidates the probe and re-targets the step', async () => {
    const { stepper, fetcher } = makeStepper(makeStore({ gap: true }));
    const store = fetcher.store!;
    stepper.enterStepping(T0);
    for (let i = 0; i < 5; i++) {
      stepper.stepPrev();
      await flush();
    }
    stepper.stepPrev();
    await flush();
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(1);

    // The probe delivers a GOP inside the gap: the hole boundaries are
    // stale, so the step re-targets against the new coverage.
    const spanMs = (5 * 512 * 1000) / TIMESCALE;
    store.insertFragment(
      {
        seq: 8, trackId: 1, baseDts: 20 * 512,
        samples: Array.from({ length: 5 }, (_, i) => ({
          dts: 20 * 512 + i * 512, pts: 20 * 512 + i * 512,
          duration: 512, key: i === 0, bytes: new Uint8Array(100),
        })),
      },
      { timestampMs: T0 - spanMs - 400, rtpTimestamp: 20 * 512 },
      0,
    );
    fetcher.emit('progress', { addedSamples: 5 });
    await flush();
    // Recomputed: the candidate is now the in-gap data, still detached
    // from the cursor → a fresh, narrower probe.
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(2);
  });

  it('consumes a click coalesced during a cold decode: replayed once, never leaked (M2)', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);

    stepper.stepPrev(); // cold GOP decode → creates the decoder
    await flush();
    expect(events.frame).toHaveLength(1);

    const decoder = MockDecoder.instances[0];
    let release!: (f: FakeFrame) => void;
    decoder.cachedFrame.mockReturnValueOnce(null);
    decoder.frameAt.mockImplementationOnce(
      () => new Promise<FakeFrame>((r) => { release = r; }),
    );
    stepper.stepPrev(); // decode-driven loading (no fetch wait)
    await flush();
    expect(stepper.state).toBe('loading');

    stepper.stepPrev(); // coalesces while the decode is in flight
    release({ ticks: 0 });
    await flush();

    // Both clicks paint: the hung decode's frame, then the replayed step.
    expect(events.frame).toHaveLength(3);
    expect(stepper.state).toBe('stepping');

    // …and nothing leaks: background progress during a LATER decode-driven
    // loading must not resurrect a phantom step that cancels the real paint.
    let release2!: (f: FakeFrame) => void;
    decoder.cachedFrame.mockReturnValueOnce(null);
    decoder.frameAt.mockImplementationOnce(
      () => new Promise<FakeFrame>((r) => { release2 = r; }),
    );
    stepper.stepPrev();
    await flush();
    expect(stepper.state).toBe('loading');
    fetcher.emit('progress', { addedSamples: 0 });
    await flush();
    expect(events.frame).toHaveLength(3); // no phantom paint
    release2({ ticks: 0 });
    await flush();
    expect(events.frame).toHaveLength(4); // exactly the hung decode's own paint
    expect(stepper.state).toBe('stepping');
  });

  it('snaps the entry to the governing store sample: sub-frame anchor error never eats the first click (M13)', async () => {
    const { stepper, fetcher, events } = makeStepper();
    const store = fetcher.store!;
    const displayed = store.prevSample(store.epochMsToTicks(T0))!;
    // The integration's anchor disagrees with the fetch mapping by a few ms.
    stepper.enterStepping(msOf(store, displayed.ticks) + 3);

    // The cursor reports the real sample, not the raw conversion.
    expect(stepper.cursorEpochMs).toBeCloseTo(msOf(store, displayed.ticks), 3);

    stepper.stepPrev();
    await flush();
    // First click paints the frame BEFORE the displayed one — no repaint.
    const expected = store.prevSample(displayed.ticks)!;
    expect((events.frame[0] as { epochMs: number }).epochMs)
      .toBeCloseTo(msOf(store, expected.ticks), 3);
  });

  it('stepNext repaints the snapped entry sample and only exits past it (M13)', async () => {
    const { stepper, fetcher, events } = makeStepper();
    const store = fetcher.store!;
    const displayed = store.prevSample(store.epochMsToTicks(T0))!;
    // Sub-epsilon NEGATIVE wobble: the raw no-epsilon compare made
    // paint-the-entry-frame vs exitforward a coin flip here.
    stepper.enterStepping(msOf(store, displayed.ticks) - 0.5);

    stepper.stepPrev();
    await flush();
    stepper.stepPrev();
    await flush();
    stepper.stepNext();
    await flush();
    stepper.stepNext(); // back AT the entry sample — painted, not an exit
    await flush();
    expect(events.exitforward).toHaveLength(0);
    expect(events.frame).toHaveLength(4);
    expect((events.frame[3] as { epochMs: number }).epochMs)
      .toBeCloseTo(msOf(store, displayed.ticks), 3);

    stepper.stepNext(); // past the entry → hand back
    await flush();
    expect(events.exitforward).toHaveLength(1);
    expect(events.frame).toHaveLength(4);
  });

  it('does not snap a mid-interval scrub anchor to a far-off sample', () => {
    const { stepper } = makeStepper();
    // T0 sits a full frame interval above the last sample — the anchor
    // region is the uncovered exclusive end, never a snap target.
    stepper.enterStepping(T0);
    expect(stepper.cursorEpochMs).toBeCloseTo(T0, 3);
  });

  it('reanchor() re-binds the entry snap at the new anchor (idempotent per entry)', () => {
    const { stepper, fetcher } = makeStepper();
    const store = fetcher.store!;
    const s10 = store.prevSample(store.epochMsToTicks(T0))!;
    stepper.enterStepping(msOf(store, s10.ticks) + 3);
    expect(stepper.cursorEpochMs).toBeCloseTo(msOf(store, s10.ticks), 3);

    const s8 = store.prevSample(store.prevSample(s10.ticks)!.ticks)!;
    stepper.reanchor(msOf(store, s8.ticks) + 3);
    expect(stepper.cursorEpochMs).toBeCloseTo(msOf(store, s8.ticks), 3);
  });

  it('a hole probe whose data conflicted away never verifies the hole: one fresh-anchor re-aim, then an honest abandon (M5)', async () => {
    const { stepper, fetcher, events } = makeStepper(makeStore({ gap: true }));
    stepper.enterStepping(T0);
    for (let i = 0; i < 5; i++) {
      stepper.stepPrev();
      await flush();
    }

    stepper.stepPrev(); // across the gap → probe
    await flush();
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(1);

    // The probe's re-delivery conflicted away (no progress) and stalled:
    // the gap is NOT empty — data exists, it conflicted. Re-aim once.
    fetcher.stitchConflicts = 1;
    fetcher.emit('stalled');
    await flush();
    expect(events.frame).toHaveLength(5); // never stepped across
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(2);
    expect(stepper.state).toBe('loading');

    // The fresh anchor conflicted too → abandon with the hole unverified.
    fetcher.stitchConflicts = 2;
    fetcher.emit('stalled');
    await flush();
    expect(events.frame).toHaveLength(5); // no silent skip
    expect(stepper.state).toBe('stepping');
    expect(events.loading.at(-1)).toBe(false);
    expect(events.noearlierframe).toHaveLength(0); // never a boundary
    expect(events.disabled).toHaveLength(0);

    // A later clean probe (no conflict growth) still verdicts honestly.
    stepper.stepPrev();
    await flush();
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(3);
    fetcher.emit('stalled');
    await flush();
    expect(events.frame).toHaveLength(6); // verified-empty → honest cross
    expect(stepper.state).toBe('stepping');
  });

  it('fetcher conflictfailed ends the wait without verifying the hole or concluding a boundary', async () => {
    const { stepper, fetcher, events } = makeStepper(makeStore({ gap: true }));
    stepper.enterStepping(T0);
    for (let i = 0; i < 5; i++) {
      stepper.stepPrev();
      await flush();
    }
    stepper.stepPrev(); // probe in flight
    await flush();
    expect(stepper.state).toBe('loading');

    fetcher.emit('conflictfailed');
    await flush();
    expect(stepper.state).toBe('stepping');
    expect(events.frame).toHaveLength(5); // never crossed the gap
    expect(events.noearlierframe).toHaveLength(0);
    expect(events.disabled).toHaveLength(0);

    // No boundary was remembered: the next prev click probes again.
    stepper.stepPrev();
    await flush();
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(2);
    expect(stepper.state).toBe('loading');
  });

  it('a verified-empty probe settles its aim before crossing — no orphaned stall cadence (P0.12)', async () => {
    const { stepper, fetcher, events } = makeStepper(makeStore({ gap: true }));
    fetcher.pauseDelivery.mockImplementation(() => {
      fetcher.state = 'paused';
      fetcher.probing = false;
    });
    stepper.enterStepping(T0);
    for (let i = 0; i < 5; i++) {
      stepper.stepPrev();
      await flush();
    }

    stepper.stepPrev(); // across the gap → probe
    await flush();
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(1);
    fetcher.state = 'collecting';
    fetcher.probing = true;

    // The probe goes silent with no conflict growth: verified empty. The
    // resolved probe aim must be SETTLED — left collecting it re-arms its
    // watchdog at probe cadence forever and runway maintenance (gated on
    // `collecting`) stays dead.
    fetcher.emit('stalled');
    await flush();
    expect(events.frame).toHaveLength(6); // honest cross
    expect(fetcher.pauseDelivery).toHaveBeenCalled();
    expect(fetcher.state).toBe('paused');
    expect(stepper.state).toBe('stepping');
  });

  it('an abandoned probe (conflicts persisted) settles its aim (P0.12)', async () => {
    const { stepper, fetcher, events } = makeStepper(makeStore({ gap: true }));
    fetcher.pauseDelivery.mockImplementation(() => {
      fetcher.state = 'paused';
      fetcher.probing = false;
    });
    stepper.enterStepping(T0);
    for (let i = 0; i < 5; i++) {
      stepper.stepPrev();
      await flush();
    }

    stepper.stepPrev(); // probe
    await flush();
    fetcher.state = 'collecting';
    fetcher.probing = true;

    fetcher.stitchConflicts = 1;
    fetcher.emit('stalled'); // conflicted → fresh-anchor re-aim
    await flush();
    fetcher.stitchConflicts = 2;
    fetcher.emit('stalled'); // conflicted again → give up
    await flush();

    // The give-up settled the orphaned aim; stepping itself stays alive.
    expect(fetcher.pauseDelivery).toHaveBeenCalled();
    expect(fetcher.state).toBe('paused');
    expect(stepper.state).toBe('stepping');
    expect(events.frame).toHaveLength(5); // never crossed
    expect(events.disabled).toHaveLength(0);

    // Runway maintenance is back: a later step that needs data re-aims.
    stepper.stepPrev();
    await flush();
    expect(fetcher.refetchHole).toHaveBeenCalledTimes(3);
  });

  it('a user extend abandoned on stall strikes settles its aim (P0.12)', async () => {
    const { stepper, fetcher, events } = makeStepper();
    fetcher.pauseDelivery.mockImplementation(() => {
      fetcher.state = 'paused';
    });
    stepper.enterStepping(T0);
    for (let i = 0; i < 9; i++) {
      stepper.stepPrev();
      await flush();
    }

    stepper.stepPrev(); // out of runway → user-driven extendBack
    await flush();
    expect(fetcher.extendBack).toHaveBeenCalled();
    fetcher.state = 'collecting';

    fetcher.emit('stalled');
    fetcher.emit('stalled');
    fetcher.emit('stalled'); // bounded strikes → abandon the wait
    await flush();
    expect(stepper.state).toBe('stepping');
    expect(events.loading.at(-1)).toBe(false);
    expect(fetcher.pauseDelivery).toHaveBeenCalled();
    expect(fetcher.state).toBe('paused');
  });

  it('repeated stalls on an unowned aim settle it instead of cadencing forever (P0.12)', async () => {
    const { stepper, fetcher } = makeStepper();
    fetcher.pauseDelivery.mockImplementation(() => {
      fetcher.state = 'paused';
    });
    stepper.enterStepping(T0);
    stepper.stepPrev();
    await flush();
    expect(stepper.state).toBe('stepping'); // no wait owns the aim

    // A background aim wedges: its watchdog keeps firing with no owner.
    fetcher.state = 'collecting';
    fetcher.emit('stalled');
    fetcher.emit('stalled');
    expect(fetcher.pauseDelivery).not.toHaveBeenCalled(); // bounded, not trigger-happy
    fetcher.emit('stalled');
    expect(fetcher.pauseDelivery).toHaveBeenCalled();
    expect(fetcher.state).toBe('paused');
    expect(stepper.state).toBe('stepping');
  });

  it('background conflictfailed throttles proactive extends without striking user ladders', async () => {
    const { stepper, fetcher, events } = makeStepper();
    stepper.enterStepping(T0);

    fetcher.emit('conflictfailed');
    fetcher.emit('conflictfailed');
    expect(stepper.state).toBe('stepping');
    expect(events.disabled).toHaveLength(0);

    fetcher.extendBack.mockClear();
    fetcher.emit('windowcomplete');
    expect(fetcher.extendBack).not.toHaveBeenCalled();

    // The user's click still paints from the already-fetched runway.
    stepper.stepPrev();
    await flush();
    expect(events.frame).toHaveLength(1);
    expect(stepper.state).toBe('stepping');
  });
});
