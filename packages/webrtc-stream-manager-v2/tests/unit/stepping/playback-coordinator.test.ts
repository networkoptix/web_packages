// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { PlaybackCoordinator } from '../../../src/stepping/playback-coordinator';
import { FrameStepper } from '../../../src/stepping/frame-stepper';
import { ReversePlayer } from '../../../src/stepping/reverse-player';
import type { BackfillFetcher } from '../../../src/stepping/backfill-fetcher';
import type { GopDecoder } from '../../../src/stepping/gop-decoder';
import {
  T0, makeStore, MockFetcher, MockDecoder, ManualClock, flush,
} from './doubles';

// ─── Mock engines (spied control surfaces) ──────────────────────────────────

class MockEngine {
  private emitter = new EventTarget();
  state = 'idle';
  cursorEpochMs: number | null = null;

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

class MockStepper extends MockEngine {
  enterStepping = vi.fn((ms: number) => { this.state = 'stepping'; this.cursorEpochMs = ms; });
  stepPrev = vi.fn();
  stepNext = vi.fn();
  reanchor = vi.fn();
  exit = vi.fn(() => { this.state = 'idle'; });
  dispose = vi.fn();
}

class MockPlayer extends MockEngine {
  rate = -1;
  play = vi.fn((ms: number, rate: number) => { this.state = 'playing'; this.cursorEpochMs = ms; this.rate = rate as -1 | -2 | -4; });
  setRate = vi.fn((rate: number) => { this.rate = rate as -1 | -2 | -4; });
  stop = vi.fn(() => { this.state = 'idle'; });
  dispose = vi.fn();
}

function makeCoordinator() {
  const stepper = new MockStepper();
  const player = new MockPlayer();
  const coord = new PlaybackCoordinator({
    fetcher: {} as unknown as BackfillFetcher,
    stepper: stepper as unknown as FrameStepper,
    player: player as unknown as ReversePlayer,
  });
  const modes: string[] = [];
  coord.on('modechange', (m) => modes.push(m));
  return { coord, stepper, player, modes };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PlaybackCoordinator', () => {
  it('playReverse exits the stepper and plays at the stepper cursor by default', () => {
    const { coord, stepper, player, modes } = makeCoordinator();
    stepper.enterStepping(T0); // the tile drives stepping directly on the stepper
    stepper.cursorEpochMs = T0 - 1_000; // stepped back a second

    coord.playReverse(-2);
    expect(stepper.exit).toHaveBeenCalled();
    expect(player.play).toHaveBeenCalledWith(T0 - 1_000, -2);
    expect(coord.mode).toBe('reverse');
    expect(modes).toEqual(['reverse']);
  });

  it('playReverse honors an explicit anchor over the stepper cursor', () => {
    const { coord, player } = makeCoordinator();
    coord.playReverse(-1, T0 - 5_000);
    expect(player.play).toHaveBeenCalledWith(T0 - 5_000, -1);
  });

  it('playReverse throws when neither an anchor nor a cursor is available', () => {
    const { coord } = makeCoordinator();
    expect(() => coord.playReverse(-1)).toThrow(/anchor/);
  });

  it('setReverseRate is presentation-only (delegates to the player)', () => {
    const { coord, stepper, player } = makeCoordinator();
    stepper.enterStepping(T0);
    coord.playReverse(-1);
    coord.setReverseRate(-4);
    expect(player.setRate).toHaveBeenCalledWith(-4);
    expect(coord.mode).toBe('reverse');
  });

  it('pauseReverse stops the player and lands in warm stepping at the player cursor', () => {
    const { coord, stepper, player, modes } = makeCoordinator();
    stepper.enterStepping(T0);
    coord.playReverse(-1);
    player.cursorEpochMs = T0 - 3_000; // reversed 3 s

    coord.pauseReverse();
    expect(player.stop).toHaveBeenCalled();
    expect(stepper.enterStepping).toHaveBeenLastCalledWith(T0 - 3_000);
    expect(coord.mode).toBe('stepping');
    expect(modes).toEqual(['reverse', 'stepping']);
  });

  it('a player autostop lands in stepping at the reported cursor', () => {
    const { coord, stepper, player } = makeCoordinator();
    stepper.enterStepping(T0);
    coord.playReverse(-1);

    player.emit('autostopped', { reason: 'archive-start', cursorEpochMs: T0 - 9_000 });
    expect(stepper.enterStepping).toHaveBeenLastCalledWith(T0 - 9_000);
    expect(coord.mode).toBe('stepping');
  });

  it('stepper exitforward exits the coordinator to idle', () => {
    const { coord, stepper } = makeCoordinator();
    stepper.enterStepping(T0);
    stepper.emit('exitforward');
    expect(stepper.exit).toHaveBeenCalled();
    expect(coord.mode).toBe('idle');
  });

  it('either engine disabling puts the coordinator in disabled (terminal)', () => {
    const { coord, player } = makeCoordinator();
    player.emit('disabled', 'decoder failed twice');
    expect(coord.mode).toBe('disabled');
    // Further transitions are refused.
    coord.playReverse(-1, T0);
    expect(coord.mode).toBe('disabled');
  });

  it('reanchor routes by mode (player re-anchor while reversing, stepper reanchor after handoff)', () => {
    const { coord, stepper, player } = makeCoordinator();
    stepper.enterStepping(T0);

    // Reversing: reanchor re-aims the player, keeping the current rate.
    coord.playReverse(-2);
    coord.reanchor(T0 - 200);
    expect(player.play).toHaveBeenLastCalledWith(T0 - 200, -2);

    // Paused back into stepping (handoff): reanchor now routes to the stepper.
    player.cursorEpochMs = T0 - 200;
    coord.pauseReverse();
    expect(coord.mode).toBe('stepping');
    coord.reanchor(T0 - 300);
    expect(stepper.reanchor).toHaveBeenCalledWith(T0 - 300);
  });
});

describe('PlaybackCoordinator round-trip (real engines, shared fetcher)', () => {
  beforeEach(() => {
    MockDecoder.instances = [];
    MockDecoder.globalFailNext = 0;
  });

  it('stepping → reverse (warm, no new session) → pause → stepping, and prev still steps', async () => {
    MockDecoder.instances = [];
    const fetcher = new MockFetcher(makeStore({ gops: 60 }));
    const clock = new ManualClock();
    const stepper = new FrameStepper({
      fetcher: fetcher as unknown as BackfillFetcher,
      createDecoder: (ts) => new MockDecoder(ts) as unknown as GopDecoder,
    });
    const player = new ReversePlayer({
      fetcher: fetcher as unknown as BackfillFetcher,
      createDecoder: (ts) => { const d = new MockDecoder(ts); d.alwaysHit = true; return d as unknown as GopDecoder; },
      clock,
    });
    const coord = new PlaybackCoordinator({ fetcher: fetcher as unknown as BackfillFetcher, stepper, player });

    // The tile drives forward stepping directly on the stepper (not the coordinator).
    stepper.enterStepping(T0);
    expect(stepper.state).toBe('stepping');
    const openCallsAfterEntry = fetcher.openAtAnchor.mock.calls.length;

    // Warm entry into reverse: no new fetch session is opened.
    coord.playReverse(-1);
    expect(coord.mode).toBe('reverse');
    expect(player.state).toBe('playing');
    expect(fetcher.openAtAnchor.mock.calls.length).toBe(openCallsAfterEntry);

    clock.advance(300); // reverse a bit
    expect(player.cursorEpochMs).toBeLessThan(T0);

    // Pause → warm stepping at the player cursor (a paused seek re-aims the session).
    const pausedAtMs = player.cursorEpochMs!;
    coord.pauseReverse();
    expect(coord.mode).toBe('stepping');
    expect(fetcher.openAtAnchor).toHaveBeenLastCalledWith(pausedAtMs);

    // prev still steps from the handed-off cursor (driven on the stepper directly).
    stepper.stepPrev();
    await flush();
    expect(stepper.state).toBe('stepping');
    expect(player.state).toBe('idle'); // reverse fully stopped
  });
});
