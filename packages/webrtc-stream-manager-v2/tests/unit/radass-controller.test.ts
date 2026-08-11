// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RadassController } from '../../src/strategies/radass-controller';
import {
  LqReason,
  DEFAULT_RADASS_CONFIG,
  type RadassConfig,
} from '../../src/strategies/radass-types';
import { TargetStream } from '../../src/types';
import type { QualitySnapshot } from '../../src/strategies/quality-monitor';

/** Minimal camera info the controller needs to read each tick. */
interface MockCamera {
  connectionKey: string;
  targetStream: TargetStream;
  snapshot: QualitySnapshot;
  elementHeight: number;
  elementArea: number;
  viewportAreaFraction: number;
  canAutoUpgrade: boolean;
  statsUpdateCount: number;
}

function makeMockCamera(overrides: Partial<MockCamera> & { connectionKey: string }): MockCamera {
  return {
    targetStream: TargetStream.AUTO,
    snapshot: { mos: 5, focus: 3, stalled: false },
    elementHeight: 400,
    elementArea: 640 * 400,
    viewportAreaFraction: 0.15,
    canAutoUpgrade: true,
    statsUpdateCount: 10,
    ...overrides,
  };
}

describe('RadassController', () => {
  let controller: RadassController;
  let cameras: Map<string, MockCamera>;
  let directives: Map<string, 'high' | 'low'>;
  let config: RadassConfig;
  /** Controls the host's isPlaying(); default true. Flip to false to test pause. */
  let playing: boolean;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] });
    cameras = new Map();
    directives = new Map();
    config = { ...DEFAULT_RADASS_CONFIG };
    playing = true;

    controller = new RadassController(config, {
      getCameraInfo: (key) => {
        const cam = cameras.get(key);
        if (!cam) return null;
        return {
          targetStream: cam.targetStream,
          snapshot: cam.snapshot,
          elementHeight: cam.elementHeight,
          elementArea: cam.elementArea,
          viewportAreaFraction: cam.viewportAreaFraction,
          canAutoUpgrade: cam.canAutoUpgrade,
          statsUpdateCount: cam.statsUpdateCount,
        };
      },
      applyDirective: (key, quality) => {
        directives.set(key, quality);
      },
      isPlaying: () => playing,
    });
  });

  afterEach(() => {
    controller.dispose();
    vi.useRealTimers();
  });

  function tick(times = 1) {
    for (let i = 0; i < times; i++) {
      vi.advanceTimersByTime(config.tickIntervalMs);
    }
  }

  /**
   * Hold the current (healthy) conditions for longer than the sustained-health
   * dwell, so a performance-demoted camera becomes eligible for promotion.
   * Performance recovery is deliberately not instantaneous — see CLOUD-18327.
   */
  function holdHealthyPastRecoveryDwell() {
    vi.advanceTimersByTime(config.performanceRecoveryDelayMs + config.tickIntervalMs);
  }

  describe('forced states (Check 1)', () => {
    it('forces HQ for TargetStream.HIGH regardless of size', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        targetStream: TargetStream.HIGH,
        elementHeight: 50, // tiny
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      tick();
      expect(directives.get('cam-1')).toBe('high');
    });

    it('forces HQ when viewport area fraction > 50% even if user set LOW', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        targetStream: TargetStream.LOW,
        viewportAreaFraction: 0.55,
        elementHeight: 800,
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      tick();
      expect(directives.get('cam-1')).toBe('high');
    });

    it('forces LQ for TargetStream.LOW when below viewport threshold', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        targetStream: TargetStream.LOW,
        viewportAreaFraction: 0.20,
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      tick();
      expect(directives.get('cam-1')).toBe('low');
    });
  });

  describe('size-based switching (Check 2)', () => {
    it('switches to LQ after item is small for 1 second', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 150, // below 171px threshold
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      // Advance past the recently-added grace period (1000ms).
      // The tick at t=1000 is the first to pass the grace period and sets smallSince=1000.
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);

      // Set quality high to test demotion
      const state = controller.getState('cam-1')!;
      state.currentQuality = 'high';
      state.lqReason = LqReason.None;

      // First tick past grace period (t=1500): smallSince was set at t=1000,
      // so only 500ms have elapsed — too soon to switch.
      tick();
      expect(state.currentQuality).toBe('high');

      // Second tick (t=2000): now 1000ms since smallSince — should switch to LQ
      tick();
      expect(directives.get('cam-1')).toBe('low');
      expect(state.lqReason).toBe(LqReason.SmallItem);
    });

    it('does not switch to LQ if height is between thresholds (171-230)', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 200, // between 171 and 230
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      // Advance past grace period
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);

      const state = controller.getState('cam-1')!;
      state.currentQuality = 'high';

      tick(10); // Several ticks
      expect(state.currentQuality).toBe('high');
    });

    it('switches back to HQ when height exceeds hysteresis threshold (230px)', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 150,
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      // Advance past both grace period (1s) and switch cooldown (5s)
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);

      const state = controller.getState('cam-1')!;
      state.currentQuality = 'low';
      state.lqReason = LqReason.SmallItem;
      state.lastSwitchTime = 0; // cooldown expired (now > 5s past lastSwitchTime)

      // Grow the element above hysteresis
      cam.elementHeight = 250;
      tick();
      expect(directives.get('cam-1')).toBe('high');
    });

    it('does not promote small-item LQ if below hysteresis (between 171-230)', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 200, // above 171 but below 230
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      // Advance past grace period
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);

      const state = controller.getState('cam-1')!;
      state.currentQuality = 'low';
      state.lqReason = LqReason.SmallItem;
      state.lastSwitchTime = 0;

      tick();
      expect(state.currentQuality).toBe('low'); // hysteresis holds
    });

    it('respects cooldown on HQ promotion', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 250,
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      // Advance past grace period
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);

      const state = controller.getState('cam-1')!;
      state.currentQuality = 'low';
      state.lqReason = LqReason.SmallItem;
      state.lastSwitchTime = performance.now(); // just switched

      tick();
      expect(state.currentQuality).toBe('low'); // cooldown blocks
    });
  });

  describe('performance-based switching (Check 3)', () => {
    it('demotes the SMALLEST HQ camera when any camera reports low MOS', () => {
      // cam-1: big HQ, cam-2: small HQ. cam-1 reports bad MOS.
      // Result: cam-2 (smallest HQ) should be demoted, not cam-1.
      const cam1 = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 500,
        elementArea: 800 * 500,
        snapshot: { mos: 2.0, focus: 3, stalled: false }, // bad MOS
      });
      const cam2 = makeMockCamera({
        connectionKey: 'cam-2',
        elementHeight: 300,
        elementArea: 400 * 300,
        snapshot: { mos: 5.0, focus: 3, stalled: false }, // good MOS
      });

      cameras.set('cam-1', cam1);
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-1');
      controller.registerCamera('cam-2');

      // Advance past grace period and cooldown first, then set state
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);

      const state1 = controller.getState('cam-1')!;
      const state2 = controller.getState('cam-2')!;
      state1.currentQuality = 'high';
      state2.currentQuality = 'high';
      state1.registeredAt = 0;
      state2.registeredAt = 0;
      state1.lastSwitchTime = 0;
      state2.lastSwitchTime = 0;

      // One tick to trigger performance demotion
      tick();

      // cam-2 (smallest HQ) should be demoted
      expect(state2.currentQuality).toBe('low');
      expect(state2.lqReason).toBe(LqReason.Performance);
      // cam-1 stays HQ (it reported the problem, but it's larger)
      expect(state1.currentQuality).toBe('high');
    });

    it('promotes LQ camera back to HQ when MOS recovers (if not anti-thrashed)', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 300,
        snapshot: { mos: 4.5, focus: 3, stalled: false },
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      // Advance past grace period and cooldown
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);

      const state = controller.getState('cam-1')!;
      state.currentQuality = 'low';
      state.lqReason = LqReason.Performance;
      state.lastSwitchTime = 0;
      state.registeredAt = 0;

      // Health must be sustained, not instantaneous, before promotion.
      holdHealthyPastRecoveryDwell();
      expect(state.currentQuality).toBe('high');
    });

    it('sets per-camera antiThrash when oscillation detected (promote then demote)', () => {
      const cam1 = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 300,
        elementArea: 400 * 300,
        snapshot: { mos: 2.0, focus: 3, stalled: false },
      });
      const cam2 = makeMockCamera({
        connectionKey: 'cam-2',
        elementHeight: 250,
        elementArea: 350 * 250,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      cameras.set('cam-1', cam1);
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-1');
      controller.registerCamera('cam-2');

      // Advance past grace period and cooldown first
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);

      const state1 = controller.getState('cam-1')!;
      const state2 = controller.getState('cam-2')!;
      state1.currentQuality = 'high';
      state2.currentQuality = 'high';
      state1.registeredAt = 0;
      state2.registeredAt = 0;
      state1.lastSwitchTime = 0;
      state2.lastSwitchTime = 0;

      // First demotion: cam-1 bad MOS → cam-2 (smaller) demoted
      tick();
      expect(state2.lqReason).toBe(LqReason.Performance);

      // Recovery: cam-1 gets good MOS and *stays* good past the sustained-health
      // dwell — a genuine recovery, not the transient relief the demotion itself
      // caused — so cam-2 is promoted back.
      cam1.snapshot = { mos: 5.0, focus: 3, stalled: false };
      holdHealthyPastRecoveryDwell();
      expect(state2.currentQuality).toBe('high');

      // Second demotion: cam-1 bad MOS again → cam-2 demoted again
      cam1.snapshot = { mos: 2.0, focus: 3, stalled: false };
      state2.lastSwitchTime = 0;
      tick();
      expect(state2.lqReason).toBe(LqReason.Performance);

      // Now anti-thrash should be set — no more auto promotions, even after a
      // genuinely sustained healthy period.
      cam1.snapshot = { mos: 5.0, focus: 3, stalled: false };
      holdHealthyPastRecoveryDwell();
      // cam-2 should NOT be promoted (anti-thrash blocks it)
      expect(state2.currentQuality).toBe('low');
    });
  });

  describe('swap logic (Check 4)', () => {
    it('swaps when largest LQ area >= 2x smallest HQ area', () => {
      const bigLq = makeMockCamera({
        connectionKey: 'cam-big',
        elementHeight: 600,
        elementArea: 1000 * 600, // 600,000
      });
      const smallHq = makeMockCamera({
        connectionKey: 'cam-small',
        elementHeight: 250,
        elementArea: 400 * 250, // 100,000
      });
      cameras.set('cam-big', bigLq);
      cameras.set('cam-small', smallHq);
      controller.registerCamera('cam-big');
      controller.registerCamera('cam-small');

      const bigState = controller.getState('cam-big')!;
      const smallState = controller.getState('cam-small')!;
      bigState.currentQuality = 'low';
      bigState.lqReason = LqReason.SmallItem;
      bigState.lastSwitchTime = 0;
      bigState.registeredAt = 0;
      smallState.currentQuality = 'high';
      smallState.lastSwitchTime = 0;
      smallState.registeredAt = 0;

      tick();

      // 600,000 >= 100,000 * 2 → swap
      expect(bigState.currentQuality).toBe('high');
      expect(smallState.currentQuality).toBe('low');
    });

    it('does not swap when ratio is below 2x', () => {
      const bigLq = makeMockCamera({
        connectionKey: 'cam-big',
        elementArea: 150_000,
        elementHeight: 300,
      });
      const smallHq = makeMockCamera({
        connectionKey: 'cam-small',
        elementArea: 100_000,
        elementHeight: 250,
      });
      cameras.set('cam-big', bigLq);
      cameras.set('cam-small', smallHq);
      controller.registerCamera('cam-big');
      controller.registerCamera('cam-small');

      const bigState = controller.getState('cam-big')!;
      bigState.currentQuality = 'low';
      bigState.lqReason = LqReason.SmallItem;
      bigState.lastSwitchTime = 0;
      bigState.registeredAt = 0;
      controller.getState('cam-small')!.currentQuality = 'high';
      controller.getState('cam-small')!.registeredAt = 0;

      tick();

      // 150,000 < 100,000 * 2 → no swap
      expect(bigState.currentQuality).toBe('low');
    });

    it('inherits LQ reason from the large camera on swap', () => {
      // SmallItem stands in for "some swap-eligible LQ reason". Performance is
      // deliberately not used here: a performance-demoted camera is excluded from
      // swap entirely (CLOUD-18327), so it could never reach the inherit path.
      // The 200px height keeps cam-big inside the size hysteresis band so the
      // per-camera SmallItem recovery cannot promote it ahead of the swap.
      const bigLq = makeMockCamera({
        connectionKey: 'cam-big',
        elementArea: 600_000,
        elementHeight: 200,
      });
      const smallHq = makeMockCamera({
        connectionKey: 'cam-small',
        elementArea: 100_000,
        elementHeight: 250,
      });
      cameras.set('cam-big', bigLq);
      cameras.set('cam-small', smallHq);
      controller.registerCamera('cam-big');
      controller.registerCamera('cam-small');

      const bigState = controller.getState('cam-big')!;
      bigState.currentQuality = 'low';
      bigState.lqReason = LqReason.SmallItem;
      bigState.lastSwitchTime = 0;
      bigState.registeredAt = 0;
      controller.getState('cam-small')!.currentQuality = 'high';
      controller.getState('cam-small')!.registeredAt = 0;
      controller.getState('cam-small')!.lastSwitchTime = 0;

      tick();

      const smallState = controller.getState('cam-small')!;
      expect(bigState.currentQuality).toBe('high');
      expect(smallState.lqReason).toBe(LqReason.SmallItem);
    });
  });

  describe('camera count enforcement (Check 5)', () => {
    it('forces LQ for cameras added when count exceeds 16', () => {
      // Register 16 cameras (these are fine)
      for (let i = 0; i < 16; i++) {
        const cam = makeMockCamera({ connectionKey: `cam-${i}`, elementHeight: 400 });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
      }

      // 17th camera should start LQ with TooManyItems
      const cam17 = makeMockCamera({ connectionKey: 'cam-16', elementHeight: 400 });
      cameras.set('cam-16', cam17);
      controller.registerCamera('cam-16');

      const state = controller.getState('cam-16')!;
      expect(state.lqReason).toBe(LqReason.TooManyItems);
    });
  });

  describe('new camera inheritance (Check 6)', () => {
    it('inherits LQ when existing cameras have performance-based LQ', () => {
      const cam1 = makeMockCamera({ connectionKey: 'cam-1' });
      cameras.set('cam-1', cam1);
      controller.registerCamera('cam-1');

      // Set cam-1 to LQ for performance
      const state1 = controller.getState('cam-1')!;
      state1.currentQuality = 'low';
      state1.lqReason = LqReason.Performance;

      // Add new camera — should inherit LQ
      const cam2 = makeMockCamera({ connectionKey: 'cam-2', elementHeight: 400 });
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-2');

      const state2 = controller.getState('cam-2')!;
      expect(state2.lqReason).toBe(LqReason.InheritedLq);
    });

    it('does NOT inherit LQ when only small-item LQ exists', () => {
      const cam1 = makeMockCamera({ connectionKey: 'cam-1' });
      cameras.set('cam-1', cam1);
      controller.registerCamera('cam-1');

      const state1 = controller.getState('cam-1')!;
      state1.currentQuality = 'low';
      state1.lqReason = LqReason.SmallItem;

      const cam2 = makeMockCamera({ connectionKey: 'cam-2', elementHeight: 400 });
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-2');

      const state2 = controller.getState('cam-2')!;
      expect(state2.lqReason).not.toBe(LqReason.InheritedLq);
    });
  });

  describe('max concurrent cap enforcement (Check 8)', () => {
    it('downgrades smallest HQ cameras when exceeding cap', () => {
      config.maxConcurrentHighRes = 2;
      controller.dispose();
      controller = new RadassController(config, {
        getCameraInfo: (key) => {
          const cam = cameras.get(key);
          if (!cam) return null;
          return {
            targetStream: cam.targetStream,
            snapshot: cam.snapshot,
            elementHeight: cam.elementHeight,
            elementArea: cam.elementArea,
            viewportAreaFraction: cam.viewportAreaFraction,
            canAutoUpgrade: cam.canAutoUpgrade,
            statsUpdateCount: cam.statsUpdateCount,
          };
        },
        applyDirective: (key, quality) => { directives.set(key, quality); },
        isPlaying: () => true,
      });

      // 3 cameras, all HQ — only 2 should remain
      for (let i = 0; i < 3; i++) {
        const cam = makeMockCamera({
          connectionKey: `cam-${i}`,
          elementArea: (i + 1) * 100_000, // cam-0 smallest, cam-2 largest
          elementHeight: 300,
        });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
        const state = controller.getState(`cam-${i}`)!;
        state.currentQuality = 'high';
        state.registeredAt = 0;
      }

      tick();

      // cam-0 (smallest, 100k) should be demoted
      expect(controller.getState('cam-0')!.currentQuality).toBe('low');
      expect(controller.getState('cam-0')!.lqReason).toBe(LqReason.CapExceeded);
      // cam-1 and cam-2 should stay HQ
      expect(controller.getState('cam-1')!.currentQuality).toBe('high');
      expect(controller.getState('cam-2')!.currentQuality).toBe('high');
    });
  });

  describe('recently-added grace period', () => {
    it('skips size checks for cameras added less than 1 second ago', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 100, // very small
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      const state = controller.getState('cam-1')!;
      state.currentQuality = 'high';

      // First tick — within grace period
      tick();
      expect(state.currentQuality).toBe('high'); // Not demoted yet

      // Advance past grace period + small item delay
      vi.advanceTimersByTime(config.recentlyAddedDelayMs + config.smallItemDelayMs + 100);
      expect(state.currentQuality).toBe('low');
    });
  });

  describe('initial evaluation', () => {
    it('promotes camera from LQ/None to HQ after grace period if not small', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 400, // well above small threshold
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      const state = controller.getState('cam-1')!;
      // Camera starts LQ/None by default
      expect(state.currentQuality).toBe('low');
      expect(state.lqReason).toBe(LqReason.None);

      // Within grace period — stays LQ
      tick();
      expect(state.currentQuality).toBe('low');

      // After grace period — should be promoted to HQ
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);
      expect(state.currentQuality).toBe('high');
    });

    it('does not promote camera from LQ/None if element is small', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 100, // below 171px threshold
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      // After grace period — stays LQ because it's small
      vi.advanceTimersByTime(config.recentlyAddedDelayMs + 500);
      const state = controller.getState('cam-1')!;
      expect(state.currentQuality).toBe('low');
    });
  });

  describe('integration: full RADASS cycle', () => {
    it('handles a realistic multi-camera layout lifecycle', () => {
      // Setup: 4 cameras at various sizes
      const cams = [
        makeMockCamera({ connectionKey: 'main', elementHeight: 600, elementArea: 1000 * 600, viewportAreaFraction: 0.35 }),
        makeMockCamera({ connectionKey: 'side-1', elementHeight: 300, elementArea: 400 * 300, viewportAreaFraction: 0.08 }),
        makeMockCamera({ connectionKey: 'side-2', elementHeight: 300, elementArea: 400 * 300, viewportAreaFraction: 0.08 }),
        makeMockCamera({ connectionKey: 'thumb', elementHeight: 100, elementArea: 150 * 100, viewportAreaFraction: 0.01 }),
      ];
      cams.forEach((c) => {
        cameras.set(c.connectionKey, c);
        controller.registerCamera(c.connectionKey);
        controller.getState(c.connectionKey)!.registeredAt = 0;
      });

      // All cameras start as low/None
      expect(controller.getState('main')!.currentQuality).toBe('low');
      expect(controller.getState('side-1')!.currentQuality).toBe('low');
      expect(controller.getState('side-2')!.currentQuality).toBe('low');
      expect(controller.getState('thumb')!.currentQuality).toBe('low');

      // After the grace period, cameras are promoted one per tick (rate-limited).
      // registeredAt=0, grace=1000ms, tick=500ms.
      // t=500: grace period still active (500 < 1000), no promotions
      // t=1000: grace expires, "main" promoted (first in map order), 1 switch/tick
      // t=1500: "side-1" promoted
      // t=2000: "side-2" promoted
      // "thumb" (height=100 < 171) stays LQ — it's small so it never gets initial promotion

      // Advance 2000ms to fire ticks at 500, 1000, 1500, 2000
      vi.advanceTimersByTime(2000);

      expect(controller.getState('main')!.currentQuality).toBe('high');
      expect(controller.getState('side-1')!.currentQuality).toBe('high');
      expect(controller.getState('side-2')!.currentQuality).toBe('high');

      // Thumb stays LQ — too small for initial promotion, lqReason stays None
      // (SmallItem reason only set on demotion from HQ)
      const thumbState = controller.getState('thumb')!;
      expect(thumbState.currentQuality).toBe('low');
      expect(thumbState.lqReason).toBe(LqReason.None);

      // Now simulate main going fullscreen (>50% viewport → forced HQ via Check 1)
      cameras.get('main')!.viewportAreaFraction = 0.60;
      tick();
      expect(directives.get('main')).toBe('high');

      // Simulate performance degradation on side-1 (bad MOS)
      cameras.get('side-1')!.snapshot = { mos: 2.0, focus: 3, stalled: false };

      // Need to advance past the switch cooldown for side cameras.
      // side-1 and side-2 were promoted at t=1500 and t=2000 respectively,
      // and we're now at t=2500 after the previous tick().
      // switchCooldownMs=5000, so side-2's lastSwitchTime=2000.
      // We need to reach t >= 2000+5000 = 7000 for side-2 to be switchable.
      // Advance to get past cooldown (we're at 2500 now, need 4500 more).
      vi.advanceTimersByTime(config.switchCooldownMs);

      // Now at t=7500. The performance check (Check 3) should demote the
      // smallest HQ camera. side-1 and side-2 have the same area (120000),
      // but side-1 is encountered first → it gets demoted.
      // "main" is forced HQ (viewport > 50%) so it's exempt.
      const side1State = controller.getState('side-1')!;
      const side2State = controller.getState('side-2')!;

      // At least one of the side cameras should be demoted for performance
      const demotedForPerf = [side1State, side2State].find(
        (s) => s.lqReason === LqReason.Performance,
      );
      expect(demotedForPerf).toBeDefined();

      // The main camera stays HQ (forced by viewport fraction)
      expect(controller.getState('main')!.currentQuality).toBe('high');
    });
  });

  describe('anti-thrash recovery (Check 7)', () => {
    it('recovers after 10 minutes when camera does not report bad MOS', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 300,
        elementArea: 400 * 300,
        snapshot: { mos: 5, focus: 3, stalled: false },
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      const state = controller.getState('cam-1')!;
      state.currentQuality = 'low';
      state.lqReason = LqReason.Performance;
      state.lastSwitchTime = 0;
      state.registeredAt = 0;

      // Manually trigger per-camera anti-thrash
      state.antiThrash = true;
      state.antiThrashAt = performance.now();

      // Verify blocked
      tick();
      expect(state.currentQuality).toBe('low');

      // Advance 10 minutes
      vi.advanceTimersByTime(config.antiThrashRetryMs);

      // Should recover
      expect(state.currentQuality).toBe('high');
    });

    it('resets anti-thrash when a camera is unregistered', () => {
      const cam1 = makeMockCamera({ connectionKey: 'cam-1' });
      const cam2 = makeMockCamera({ connectionKey: 'cam-2' });
      cameras.set('cam-1', cam1);
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-1');
      controller.registerCamera('cam-2');

      // Set per-camera anti-thrash on cam-1
      const state1 = controller.getState('cam-1')!;
      state1.antiThrash = true;

      // Unregistering cam-2 triggers resetAntiThrash on all remaining cameras
      controller.unregisterCamera('cam-2');
      expect(state1.antiThrash).toBe(false);
    });
  });

  describe('P1 Finding 1: TooManyItems and InheritedLq recovery', () => {
    it('TooManyItems camera recovers when camera count drops below limit', () => {
      // Register 17 cameras (cam0-cam16). cam16 (the 17th) gets TooManyItems.
      for (let i = 0; i < 17; i++) {
        const cam = makeMockCamera({ connectionKey: `cam-${i}`, elementHeight: 400 });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
      }

      const state16 = controller.getState('cam-16')!;
      expect(state16.lqReason).toBe(LqReason.TooManyItems);
      expect(state16.currentQuality).toBe('low');

      // Advance past grace period + cooldown so the camera is eligible
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);

      // Confirm still LQ
      expect(state16.currentQuality).toBe('low');
      expect(state16.lqReason).toBe(LqReason.TooManyItems);

      // Unregister two cameras to drop count to 15 (below the 16-camera limit).
      // Registration uses >= 16 to trigger TooManyItems, so recovery requires < 16.
      controller.unregisterCamera('cam-14');
      cameras.delete('cam-14');
      controller.unregisterCamera('cam-15');
      cameras.delete('cam-15');

      // Clear cooldown for cam-16 so it can switch
      state16.lastSwitchTime = 0;

      tick();

      // cam-16 should now promote to HQ since count (15) < maxCamerasBeforeForceLq (16)
      expect(state16.currentQuality).toBe('high');
      expect(state16.lqReason).toBe(LqReason.None);
    });

    it('TooManyItems camera stays LQ while count is still at limit', () => {
      // Register 17 cameras
      for (let i = 0; i < 17; i++) {
        const cam = makeMockCamera({ connectionKey: `cam-${i}`, elementHeight: 400 });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
      }

      const state16 = controller.getState('cam-16')!;
      expect(state16.lqReason).toBe(LqReason.TooManyItems);

      // Advance past grace period + cooldown
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);

      // Don't unregister anyone. Tick several times.
      state16.lastSwitchTime = 0;
      tick(5);

      // cam-16 should remain low/TooManyItems
      expect(state16.currentQuality).toBe('low');
      expect(state16.lqReason).toBe(LqReason.TooManyItems);
    });

    it('InheritedLq camera recovers when performance issues clear', () => {
      // Register cam-1 with bad MOS to create a performance demotion scenario
      const cam1 = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 400,
        elementArea: 640 * 400,
        snapshot: { mos: 2.0, focus: 3, stalled: false }, // bad MOS
      });
      cameras.set('cam-1', cam1);
      controller.registerCamera('cam-1');

      // Advance past grace period and promote cam-1 to HQ first
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);
      const state1 = controller.getState('cam-1')!;
      // cam-1 should have been promoted (initial eval)
      expect(state1.currentQuality).toBe('high');

      // Advance past cooldown so demotion can happen
      vi.advanceTimersByTime(config.switchCooldownMs);

      // cam-1 has bad MOS but is the only HQ camera, so it gets demoted
      expect(state1.currentQuality).toBe('low');
      expect(state1.lqReason).toBe(LqReason.Performance);

      // Now register cam-2 while cam-1 has Performance reason → cam-2 gets InheritedLq
      const cam2 = makeMockCamera({
        connectionKey: 'cam-2',
        elementHeight: 400,
        elementArea: 640 * 400,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-2');

      const state2 = controller.getState('cam-2')!;
      expect(state2.lqReason).toBe(LqReason.InheritedLq);

      // Now fix cam-1's MOS so performance recovers
      cam1.snapshot = { mos: 5.0, focus: 3, stalled: false };

      // Advance past cooldown for cam-1 to allow promotion
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);
      state1.lastSwitchTime = 0;

      // Hold the recovery past the sustained-health dwell to promote cam-1 back.
      holdHealthyPastRecoveryDwell();
      expect(state1.currentQuality).toBe('high');

      // Now cam-1 is HQ/None. There should be no more performance-class LQ cameras
      // except cam-2 (InheritedLq). After cam-2's own InheritedLq is the only one,
      // and no Performance/TooManyItems/CapExceeded remain, cam-2 should recover.
      state2.lastSwitchTime = 0;
      tick();
      expect(state2.currentQuality).toBe('high');
      expect(state2.lqReason).toBe(LqReason.None);
    });

    it('InheritedLq camera stays LQ while performance issues persist', () => {
      // Register cam-1 with bad MOS
      const cam1 = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 400,
        elementArea: 640 * 400,
        snapshot: { mos: 2.0, focus: 3, stalled: false },
      });
      cameras.set('cam-1', cam1);
      controller.registerCamera('cam-1');

      // Advance past grace period to promote cam-1
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);
      const state1 = controller.getState('cam-1')!;
      expect(state1.currentQuality).toBe('high');

      // Advance past cooldown so demotion triggers
      vi.advanceTimersByTime(config.switchCooldownMs);
      expect(state1.currentQuality).toBe('low');
      expect(state1.lqReason).toBe(LqReason.Performance);

      // Register cam-2 → InheritedLq
      const cam2 = makeMockCamera({
        connectionKey: 'cam-2',
        elementHeight: 400,
        elementArea: 640 * 400,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-2');

      const state2 = controller.getState('cam-2')!;
      expect(state2.lqReason).toBe(LqReason.InheritedLq);

      // Keep cam-1 at bad MOS. Advance and tick several times.
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);
      state2.lastSwitchTime = 0;
      tick(5);

      // cam-2 should remain low/InheritedLq because cam-1 still has Performance LQ
      expect(state2.currentQuality).toBe('low');
      expect(state2.lqReason).toBe(LqReason.InheritedLq);
    });
  });

  describe('P1 Finding 2: remove switchedThisTick from initial-promotion and hysteresis paths', () => {
    it('all cameras promote from LQ/None in a single tick', () => {
      // Register 6 cameras, all with elementHeight 400 (above threshold)
      for (let i = 0; i < 6; i++) {
        const cam = makeMockCamera({ connectionKey: `cam-${i}`, elementHeight: 400 });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
        // Set registeredAt to 0 so grace period is already passed
        controller.getState(`cam-${i}`)!.registeredAt = 0;
      }

      // Advance past grace period
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);

      // Single tick
      tick();

      // ALL 6 cameras should be HQ after one tick (not just 1)
      for (let i = 0; i < 6; i++) {
        const state = controller.getState(`cam-${i}`)!;
        expect(state.currentQuality).toBe('high');
      }
    });

    it('multiple cameras recover via hysteresis in a single tick', () => {
      // Register 4 cameras and manually set them to LQ/SmallItem
      // (simulating they were previously demoted for being small)
      for (let i = 0; i < 4; i++) {
        const cam = makeMockCamera({ connectionKey: `cam-${i}`, elementHeight: 400 });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
        const state = controller.getState(`cam-${i}`)!;
        state.registeredAt = 0;
        state.currentQuality = 'low';
        state.lqReason = LqReason.SmallItem;
        state.lastSwitchTime = 0; // cooldown expired
      }

      // Advance past grace period
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);

      // All cameras have elementHeight 400 > hysteresisHeightPx 230, cooldown expired.
      // Single tick should promote ALL 4 at once.
      tick();

      // ALL 4 should be HQ again after one tick
      for (let i = 0; i < 4; i++) {
        const state = controller.getState(`cam-${i}`)!;
        expect(state.currentQuality).toBe('high');
      }
    });
  });

  describe('Fix A: stable stats gate for performance demotion', () => {
    it('does not trigger performance demotion when camera has fewer than minStatsForPerformanceCheck updates', () => {
      const cam1 = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 500,
        elementArea: 800 * 500,
        snapshot: { mos: 2.0, focus: 3, stalled: false }, // bad MOS
        statsUpdateCount: 1, // below threshold of 3
      });
      const cam2 = makeMockCamera({
        connectionKey: 'cam-2',
        elementHeight: 300,
        elementArea: 400 * 300,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
        statsUpdateCount: 1,
      });

      cameras.set('cam-1', cam1);
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-1');
      controller.registerCamera('cam-2');

      // Advance past grace period and cooldown, then set state
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);

      const state1 = controller.getState('cam-1')!;
      const state2 = controller.getState('cam-2')!;
      state1.currentQuality = 'high';
      state2.currentQuality = 'high';
      state1.registeredAt = 0;
      state2.registeredAt = 0;
      state1.lastSwitchTime = 0;
      state2.lastSwitchTime = 0;

      tick();

      // No performance demotion should occur — stats are too fresh
      expect(state1.currentQuality).toBe('high');
      expect(state2.currentQuality).toBe('high');
    });

    it('triggers performance demotion when camera meets minStatsForPerformanceCheck threshold', () => {
      const cam1 = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 500,
        elementArea: 800 * 500,
        snapshot: { mos: 2.0, focus: 3, stalled: false }, // bad MOS
        statsUpdateCount: config.minStatsForPerformanceCheck, // meets threshold
      });
      const cam2 = makeMockCamera({
        connectionKey: 'cam-2',
        elementHeight: 300,
        elementArea: 400 * 300,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
        statsUpdateCount: config.minStatsForPerformanceCheck,
      });

      cameras.set('cam-1', cam1);
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-1');
      controller.registerCamera('cam-2');

      // Advance past grace period and cooldown, then set state
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);

      const state1 = controller.getState('cam-1')!;
      const state2 = controller.getState('cam-2')!;
      state1.currentQuality = 'high';
      state2.currentQuality = 'high';
      state1.registeredAt = 0;
      state2.registeredAt = 0;
      state1.lastSwitchTime = 0;
      state2.lastSwitchTime = 0;

      tick();

      // cam-2 (smallest HQ) should be demoted for performance
      expect(state2.currentQuality).toBe('low');
      expect(state2.lqReason).toBe(LqReason.Performance);
      expect(state1.currentQuality).toBe('high');
    });
  });

  describe('Fix C: per-camera anti-thrash', () => {
    it('anti-thrash is per-camera, not global', () => {
      // Register 3 cameras: cam1 (big), cam2 (medium), cam3 (small)
      const cam1 = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 500,
        elementArea: 800 * 500,
        snapshot: { mos: 2.0, focus: 3, stalled: false }, // bad MOS initially
      });
      const cam2 = makeMockCamera({
        connectionKey: 'cam-2',
        elementHeight: 350,
        elementArea: 600 * 350,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      const cam3 = makeMockCamera({
        connectionKey: 'cam-3',
        elementHeight: 250,
        elementArea: 400 * 250,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });

      cameras.set('cam-1', cam1);
      cameras.set('cam-2', cam2);
      cameras.set('cam-3', cam3);
      controller.registerCamera('cam-1');
      controller.registerCamera('cam-2');
      controller.registerCamera('cam-3');

      // Advance past grace period + cooldown and set all HQ
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);
      const state1 = controller.getState('cam-1')!;
      const state2 = controller.getState('cam-2')!;
      const state3 = controller.getState('cam-3')!;
      state1.currentQuality = 'high';
      state2.currentQuality = 'high';
      state3.currentQuality = 'high';
      state1.registeredAt = 0;
      state2.registeredAt = 0;
      state3.registeredAt = 0;
      state1.lastSwitchTime = 0;
      state2.lastSwitchTime = 0;
      state3.lastSwitchTime = 0;

      // Step 1: cam1 bad MOS -> cam3 (smallest) demoted to Performance
      tick();
      expect(state3.currentQuality).toBe('low');
      expect(state3.lqReason).toBe(LqReason.Performance);

      // Step 2: cam1 MOS good and sustained past the dwell → cam3 recovers
      cam1.snapshot = { mos: 5.0, focus: 3, stalled: false };
      holdHealthyPastRecoveryDwell();
      expect(state3.currentQuality).toBe('high');
      // cam3 should have performancePromotionPending set
      expect(state3.performancePromotionPending).toBe(true);

      // Step 3: cam1 bad MOS again -> cam3 demoted again -> cam3 gets antiThrash
      cam1.snapshot = { mos: 2.0, focus: 3, stalled: false };
      state3.lastSwitchTime = 0;
      tick();
      expect(state3.currentQuality).toBe('low');
      expect(state3.lqReason).toBe(LqReason.Performance);
      expect(state3.antiThrash).toBe(true);

      // cam3's antiThrash should NOT affect cam1 or cam2
      expect(state1.antiThrash).toBe(false);
      expect(state2.antiThrash).toBe(false);
    });

    it('per-camera anti-thrash recovers after antiThrashRetryMs', () => {
      // Setup: 2 cameras, trigger oscillation to set antiThrash on cam2
      const cam1 = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 500,
        elementArea: 800 * 500,
        snapshot: { mos: 2.0, focus: 3, stalled: false },
      });
      const cam2 = makeMockCamera({
        connectionKey: 'cam-2',
        elementHeight: 300,
        elementArea: 400 * 300,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });

      cameras.set('cam-1', cam1);
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-1');
      controller.registerCamera('cam-2');

      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);
      const state1 = controller.getState('cam-1')!;
      const state2 = controller.getState('cam-2')!;
      state1.currentQuality = 'high';
      state2.currentQuality = 'high';
      state1.registeredAt = 0;
      state2.registeredAt = 0;
      state1.lastSwitchTime = 0;
      state2.lastSwitchTime = 0;

      // Demotion 1
      tick();
      expect(state2.lqReason).toBe(LqReason.Performance);

      // Promote back after a sustained healthy period
      cam1.snapshot = { mos: 5.0, focus: 3, stalled: false };
      holdHealthyPastRecoveryDwell();
      expect(state2.currentQuality).toBe('high');

      // Demotion 2 -> antiThrash set on cam2
      cam1.snapshot = { mos: 2.0, focus: 3, stalled: false };
      state2.lastSwitchTime = 0;
      tick();
      expect(state2.antiThrash).toBe(true);

      // Now MOS recovers but cam2 can't promote due to antiThrash
      cam1.snapshot = { mos: 5.0, focus: 3, stalled: false };
      state2.lastSwitchTime = 0;
      tick();
      expect(state2.currentQuality).toBe('low');

      // Advance past antiThrashRetryMs — the anti-thrash brake itself releases.
      vi.advanceTimersByTime(config.antiThrashRetryMs);
      state2.lastSwitchTime = 0;
      tick();
      expect(state2.antiThrash).toBe(false);

      // The promotion additionally waits out the escalating backoff, since this
      // camera has one failed HQ attempt on record (CLOUD-18327). Releasing the
      // brake is necessary but no longer sufficient.
      vi.advanceTimersByTime(config.maxPerformanceRecoveryDelayMs);
      expect(state2.currentQuality).toBe('high');
    });

    it('resetAntiThrash clears per-camera anti-thrash on all cameras', () => {
      // Setup 2 cameras with antiThrash
      const cam1 = makeMockCamera({ connectionKey: 'cam-1' });
      const cam2 = makeMockCamera({ connectionKey: 'cam-2' });
      cameras.set('cam-1', cam1);
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-1');
      controller.registerCamera('cam-2');

      const state1 = controller.getState('cam-1')!;
      const state2 = controller.getState('cam-2')!;
      state1.antiThrash = true;
      state1.antiThrashAt = performance.now();
      state1.performancePromotionPending = true;
      state2.antiThrash = true;
      state2.antiThrashAt = performance.now();
      state2.performancePromotionPending = true;

      // Register a new camera — triggers resetAntiThrash
      const cam3 = makeMockCamera({ connectionKey: 'cam-3' });
      cameras.set('cam-3', cam3);
      controller.registerCamera('cam-3');

      // Both cameras should have antiThrash cleared
      expect(state1.antiThrash).toBe(false);
      expect(state1.antiThrashAt).toBe(0);
      expect(state1.performancePromotionPending).toBe(false);
      expect(state2.antiThrash).toBe(false);
      expect(state2.antiThrashAt).toBe(0);
      expect(state2.performancePromotionPending).toBe(false);
    });
  });

  describe('P1 Finding 3: cache CameraInfo per tick', () => {
    it('getCameraInfo is called at most once per camera per tick', () => {
      // Create a fresh controller with a spy on getCameraInfo
      const getCameraInfoSpy = vi.fn((key: string) => {
        const cam = cameras.get(key);
        if (!cam) return null;
        return {
          targetStream: cam.targetStream,
          snapshot: cam.snapshot,
          elementHeight: cam.elementHeight,
          elementArea: cam.elementArea,
          viewportAreaFraction: cam.viewportAreaFraction,
          canAutoUpgrade: cam.canAutoUpgrade,
          statsUpdateCount: cam.statsUpdateCount,
        };
      });

      controller.dispose();
      controller = new RadassController(config, {
        getCameraInfo: getCameraInfoSpy,
        applyDirective: (key, quality) => { directives.set(key, quality); },
        isPlaying: () => true,
      });

      // Register 8 cameras (enough to trigger cap enforcement path)
      for (let i = 0; i < 8; i++) {
        const cam = makeMockCamera({ connectionKey: `cam-${i}`, elementHeight: 400 });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
        const state = controller.getState(`cam-${i}`)!;
        state.registeredAt = 0;
        state.currentQuality = 'high';
        state.lastSwitchTime = 0;
      }

      // Reset spy count (registerCamera doesn't call getCameraInfo, but just in case)
      getCameraInfoSpy.mockClear();

      // Tick once
      tick();

      // Assert getCameraInfo was called exactly 8 times (once per camera in the pre-fetch)
      expect(getCameraInfoSpy).toHaveBeenCalledTimes(8);
    });
  });

  describe('CLOUD-18038: resume auto evaluation after manual LOW → AUTO', () => {
    it('promotes a large healthy camera back to HQ after the user returns it from LOW to AUTO', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 400, // well above hysteresis threshold (230)
        viewportAreaFraction: 0.15, // below the forced-HQ viewport fraction
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');
      controller.getState('cam-1')!.registeredAt = 0;

      // Auto: the large camera is promoted to HQ on its first post-grace tick.
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);
      const state = controller.getState('cam-1')!;
      expect(state.currentQuality).toBe('high');

      // User right-clicks → Set resolution to Low.
      cam.targetStream = TargetStream.LOW;
      tick();
      expect(state.currentQuality).toBe('low');
      expect(state.lqReason).toBe(LqReason.Manual);

      // User sets resolution back to Auto.
      cam.targetStream = TargetStream.AUTO;
      tick();

      // RADASS must resume: the large, healthy camera returns to HQ.
      expect(state.currentQuality).toBe('high');
      expect(state.lqReason).toBe(LqReason.None);
    });

    it('leaves a small camera in LQ (without a stale Manual reason) after LOW → AUTO', () => {
      const cam = makeMockCamera({
        connectionKey: 'cam-1',
        elementHeight: 120, // below small-item threshold (171) → should stay LQ in AUTO
        viewportAreaFraction: 0.05,
      });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');
      controller.getState('cam-1')!.registeredAt = 0;

      // Manual LOW.
      cam.targetStream = TargetStream.LOW;
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);
      tick();
      const state = controller.getState('cam-1')!;
      expect(state.currentQuality).toBe('low');
      expect(state.lqReason).toBe(LqReason.Manual);

      // Back to AUTO: small camera correctly stays LQ, but the Manual reason
      // must be cleared so it's a normal size-driven decision, not a stuck lock.
      cam.targetStream = TargetStream.AUTO;
      tick();
      expect(state.currentQuality).toBe('low');
      expect(state.lqReason).not.toBe(LqReason.Manual);
    });
  });

  describe('CLOUD-18327: no spurious HQ re-promotion during sustained bad MOS', () => {
    it('keeps a healthy-MOS AUTO camera in LQ (no HQ oscillation, no anti-thrash lock) while another camera has sustained bad MOS, then promotes it once MOS recovers', () => {
      // cam-bad: the struggling connection. Forced HQ (fullscreen / viewport > 50%)
      // so Pass 1 never demotes it and it never competes for the promotion slot; its
      // MOS stays bad for the whole struggle window → the system is "struggling".
      const camBad = makeMockCamera({
        connectionKey: 'cam-bad',
        elementHeight: 600,
        elementArea: 1000 * 600,
        viewportAreaFraction: 0.6, // > forceHighViewportFraction (0.50) → forced HQ
        snapshot: { mos: 2.0, focus: 3, stalled: false }, // sustained bad MOS
      });
      // cam-good: normal AUTO camera, its OWN MOS healthy the entire time, tall
      // enough (> hysteresis 230) to be promotable, and the smallest HQ so Pass 1
      // demotes it first when the system struggles.
      const camGood = makeMockCamera({
        connectionKey: 'cam-good',
        elementHeight: 300,
        elementArea: 400 * 300,
        viewportAreaFraction: 0.15,
        snapshot: { mos: 5.0, focus: 3, stalled: false }, // healthy throughout
      });

      cameras.set('cam-bad', camBad);
      cameras.set('cam-good', camGood);
      controller.registerCamera('cam-bad');
      controller.registerCamera('cam-good');

      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);
      const badState = controller.getState('cam-bad')!;
      const goodState = controller.getState('cam-good')!;
      badState.currentQuality = 'high';
      goodState.currentQuality = 'high';
      badState.registeredAt = 0;
      goodState.registeredAt = 0;
      badState.lastSwitchTime = 0;
      goodState.lastSwitchTime = 0;

      // System struggles → cam-good (smallest AUTO HQ) is demoted for performance.
      tick();
      expect(goodState.currentQuality).toBe('low');
      expect(goodState.lqReason).toBe(LqReason.Performance);

      // Sustained bad MOS: cam-good must NOT be re-promoted. That spurious HQ is the
      // bug — the promote→demote oscillation trips anti-thrash and locks the camera
      // out of HQ for antiThrashRetryMs (10 min) even after MOS recovers.
      for (let i = 0; i < 5; i++) {
        goodState.lastSwitchTime = 0; // eligible to switch if the code wanted to
        tick();
        expect(goodState.currentQuality).toBe('low');
        expect(goodState.antiThrash).toBe(false);
      }

      // MOS recovers system-wide and stays healthy past the sustained-health
      // dwell → cam-good promotes, with no anti-thrash penalty.
      camBad.snapshot = { mos: 5.0, focus: 3, stalled: false };
      goodState.lastSwitchTime = 0;
      holdHealthyPastRecoveryDwell();
      expect(goodState.currentQuality).toBe('high');
      expect(goodState.lqReason).toBe(LqReason.None);
    });
  });

  describe('CLOUD-18327 follow-up: sustained-health dwell before performance promotion', () => {
    it('does not re-promote a performance-demoted camera on the load relief its own demotion caused, and only promotes after health is sustained past performanceRecoveryDelayMs', () => {
      // Two equal-height AUTO cameras. cam-b has the smaller area, so Pass 1
      // picks it as the victim when the system reports bad MOS.
      const camA = makeMockCamera({
        connectionKey: 'cam-a',
        elementHeight: 300,
        elementArea: 500 * 300,
        viewportAreaFraction: 0.15,
        statsUpdateCount: 20,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      const camB = makeMockCamera({
        connectionKey: 'cam-b',
        elementHeight: 300,
        elementArea: 400 * 300,
        viewportAreaFraction: 0.15,
        statsUpdateCount: 20,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      cameras.set('cam-a', camA);
      cameras.set('cam-b', camB);
      controller.registerCamera('cam-a');
      controller.registerCamera('cam-b');

      // Healthy warm-up: both cameras promote to HQ and settle past the
      // recently-added grace period and the switch cooldown. Timers are advanced
      // for real throughout — the dwell timing is what is under test, so no state
      // timestamp is ever hand-set.
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);

      const stateA = controller.getState('cam-a')!;
      const stateB = controller.getState('cam-b')!;
      expect(stateA.currentQuality).toBe('high');
      expect(stateB.currentQuality).toBe('high');

      // Step 1 — system becomes loaded: the smallest HQ camera is demoted.
      camA.snapshot = { mos: 2.0, focus: 3, stalled: false };
      camB.snapshot = { mos: 2.0, focus: 3, stalled: false };
      tick();
      expect(stateB.currentQuality).toBe('low');
      expect(stateB.lqReason).toBe(LqReason.Performance);

      // Step 2 — MOS recovers because the demotion relieved the load. This
      // apparent health is an artifact of the demotion, not a real recovery, so
      // cam-b must stay LQ until health has held for performanceRecoveryDelayMs.
      camA.snapshot = { mos: 4.5, focus: 3, stalled: false };
      camB.snapshot = { mos: 4.5, focus: 3, stalled: false };
      vi.advanceTimersByTime(5_000);
      tick();
      expect(stateB.currentQuality).toBe('low');

      // Step 3 — load returns. Because cam-b was never re-promoted there is no
      // promote→demote pair, so anti-thrash must not latch.
      camA.snapshot = { mos: 2.0, focus: 3, stalled: false };
      camB.snapshot = { mos: 2.0, focus: 3, stalled: false };
      vi.advanceTimersByTime(5_000);
      tick();
      expect(stateB.antiThrash).toBe(false);

      // Step 4 — guard rail against over-correction: genuinely sustained health
      // past the dwell must still promote the camera back to HQ.
      camA.snapshot = { mos: 4.5, focus: 3, stalled: false };
      camB.snapshot = { mos: 4.5, focus: 3, stalled: false };
      vi.advanceTimersByTime(config.performanceRecoveryDelayMs + config.tickIntervalMs);
      tick();
      expect(stateB.currentQuality).toBe('high');
    });

    it('does not count paused time as healthy evidence', () => {
      const camA = makeMockCamera({
        connectionKey: 'cam-a',
        elementHeight: 300,
        elementArea: 500 * 300,
        viewportAreaFraction: 0.15,
        statsUpdateCount: 20,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      const camB = makeMockCamera({
        connectionKey: 'cam-b',
        elementHeight: 300,
        elementArea: 400 * 300,
        viewportAreaFraction: 0.15,
        statsUpdateCount: 20,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      cameras.set('cam-a', camA);
      cameras.set('cam-b', camB);
      controller.registerCamera('cam-a');
      controller.registerCamera('cam-b');

      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);
      const stateB = controller.getState('cam-b')!;

      // Loaded → cam-b demoted for performance.
      camA.snapshot = { mos: 2.0, focus: 3, stalled: false };
      camB.snapshot = { mos: 2.0, focus: 3, stalled: false };
      tick();
      expect(stateB.currentQuality).toBe('low');
      expect(stateB.lqReason).toBe(LqReason.Performance);

      // A brief healthy spell — far short of the dwell — starts the clock.
      camA.snapshot = { mos: 4.5, focus: 3, stalled: false };
      camB.snapshot = { mos: 4.5, focus: 3, stalled: false };
      tick(2);
      expect(stateB.currentQuality).toBe('low');

      // The user pauses for 20 minutes. RADASS is frozen while paused (CLOUD-18235)
      // and the streams are DC-paused, so no health evidence is gathered at all.
      // Wall-clock time alone must not satisfy the dwell.
      playing = false;
      vi.advanceTimersByTime(20 * 60 * 1000);

      playing = true;
      tick();
      expect(stateB.currentQuality).toBe('low');

      // Once genuinely observed healthy time accumulates while playing, it promotes.
      holdHealthyPastRecoveryDwell();
      expect(stateB.currentQuality).toBe('high');
    });

    it('recovers a Performance-LQ camera sitting in the 171-230px size-hysteresis band', () => {
      // Performance is a GLOBAL demotion reason, like CapExceeded / TooManyItems /
      // InheritedLq, so it must recover at smallItemHeightPx (171) — not at the
      // size hysteresis (230), which only means something for size-driven
      // demotions. Gating it at 230 strands band tiles in LQ forever now that the
      // swap path no longer promotes them (CLOUD-18303's principle).
      const camA = makeMockCamera({
        connectionKey: 'cam-a',
        elementHeight: 300,
        elementArea: 500 * 300,
        viewportAreaFraction: 0.15,
        statsUpdateCount: 20,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      const camBand = makeMockCamera({
        connectionKey: 'cam-band',
        elementHeight: 200, // inside the 171-230 band
        elementArea: 400 * 200,
        viewportAreaFraction: 0.15,
        statsUpdateCount: 20,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      cameras.set('cam-a', camA);
      cameras.set('cam-band', camBand);
      controller.registerCamera('cam-a');
      controller.registerCamera('cam-band');

      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);
      const bandState = controller.getState('cam-band')!;
      expect(bandState.currentQuality).toBe('high');

      // Loaded → the band tile is the smallest HQ, so it takes the demotion.
      camA.snapshot = { mos: 2.0, focus: 3, stalled: false };
      camBand.snapshot = { mos: 2.0, focus: 3, stalled: false };
      tick();
      expect(bandState.currentQuality).toBe('low');
      expect(bandState.lqReason).toBe(LqReason.Performance);

      // Sustained recovery: it must come back, not be stranded at its size.
      camA.snapshot = { mos: 5.0, focus: 3, stalled: false };
      camBand.snapshot = { mos: 5.0, focus: 3, stalled: false };
      holdHealthyPastRecoveryDwell();
      expect(bandState.currentQuality).toBe('high');
      expect(bandState.lqReason).toBe(LqReason.None);
    });
  });

  describe('CLOUD-18327 follow-up: escalating backoff on failed HQ attempts', () => {
    /**
     * Set up two AUTO cameras on a link that genuinely cannot carry HQ for the
     * smaller one, and return a driver that simulates the causal loop: while
     * cam-b is HQ the system is overloaded (bad MOS), and demoting it relieves
     * the load (good MOS). That coupling is what turns a memoryless promotion
     * rule into a limit cycle.
     */
    function setupUnsustainableLink() {
      const camA = makeMockCamera({
        connectionKey: 'cam-a',
        elementHeight: 400,
        elementArea: 600 * 400,
        viewportAreaFraction: 0.15,
        statsUpdateCount: 20,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      const camB = makeMockCamera({
        connectionKey: 'cam-b',
        elementHeight: 300,
        elementArea: 400 * 300,
        viewportAreaFraction: 0.15,
        statsUpdateCount: 20,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      cameras.set('cam-a', camA);
      cameras.set('cam-b', camB);
      controller.registerCamera('cam-a');
      controller.registerCamera('cam-b');
      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);

      const stateB = controller.getState('cam-b')!;
      let wasHigh = stateB.currentQuality === 'high';

      /** Run for `minutes`, returning the timestamps of each HQ promotion. */
      function run(minutes: number, opts: { healthy?: boolean } = {}): number[] {
        const steps = (minutes * 60 * 1000) / config.tickIntervalMs;
        const promotions: number[] = [];
        for (let i = 0; i < steps; i++) {
          // Load follows cam-b's own quality unless the caller forces health.
          const loaded = opts.healthy ? false : stateB.currentQuality === 'high';
          const snapshot = { mos: loaded ? 2.0 : 5.0, focus: 3, stalled: false };
          camA.snapshot = snapshot;
          camB.snapshot = snapshot;
          tick();
          const isHigh = stateB.currentQuality === 'high';
          if (isHigh && !wasHigh) promotions.push(performance.now());
          wasHigh = isHigh;
        }
        return promotions;
      }

      /** Force healthy conditions until cam-b is promoted. Returns ticks used. */
      function runHealthyUntilPromoted(maxMinutes = 60): number {
        const steps = (maxMinutes * 60 * 1000) / config.tickIntervalMs;
        for (let i = 0; i < steps; i++) {
          const snapshot = { mos: 5.0, focus: 3, stalled: false };
          camA.snapshot = snapshot;
          camB.snapshot = snapshot;
          tick();
          if (stateB.currentQuality === 'high') {
            wasHigh = true;
            return i + 1;
          }
        }
        throw new Error('cam-b was never promoted');
      }

      return { camA, camB, stateB, run, runHealthyUntilPromoted };
    }

    it('settles instead of retrying HQ forever on a link that cannot carry it', () => {
      const { stateB, run } = setupUnsustainableLink();

      const times = run(180);
      expect(times.length).toBeGreaterThanOrEqual(4);

      const gaps = times.slice(1).map((t, i) => t - times[i]);

      // Per-hour attempt counts are phase-fragile (a flat 10-minute cycle divides
      // the hour exactly, so drift decides whether an hour sees 6 or 5). Assert
      // the underlying property instead: the retry interval grows. Without the
      // backoff every gap is the same ~10 minutes forever and nothing settles.
      expect(gaps[gaps.length - 1]).toBeGreaterThan(gaps[0] * 1.4);
      expect(stateB.currentQuality).toBe('low');
    });

    it('grows the retry interval beyond the anti-thrash floor once attempts keep failing', () => {
      const { stateB, run } = setupUnsustainableLink();

      const times = run(150);
      expect(stateB.failedHqAttempts).toBeGreaterThanOrEqual(2);
      expect(times.length).toBeGreaterThanOrEqual(3);

      // Anti-thrash alone re-arms every antiThrashRetryMs, so without the backoff
      // every gap is ~10 minutes forever (tick quantization makes it a hair over,
      // hence the 1.5x margin rather than a bare >). The escalation has to
      // overtake that floor, otherwise it is masked and changes nothing.
      const lastGap = times[times.length - 1] - times[times.length - 2];
      expect(lastGap).toBeGreaterThan(config.antiThrashRetryMs * 1.5);
    });

    it('does not count paused HQ time as a successful HQ period', () => {
      const { camA, camB, stateB, run, runHealthyUntilPromoted } = setupUnsustainableLink();

      run(60);
      const failures = stateB.failedHqAttempts;
      expect(failures).toBeGreaterThanOrEqual(2);

      // Get it back to HQ, then pause immediately — well before it has held HQ
      // for successfulHqPeriodMs.
      runHealthyUntilPromoted();
      expect(stateB.currentQuality).toBe('high');
      expect(stateB.failedHqAttempts).toBe(failures);

      // Paused at HQ for 5 minutes. The stream is DC-paused, so this is zero
      // evidence that the link can now carry HQ. The failure history must stand.
      camA.snapshot = { mos: 5.0, focus: 3, stalled: false };
      camB.snapshot = { mos: 5.0, focus: 3, stalled: false };
      playing = false;
      vi.advanceTimersByTime(5 * 60 * 1000);
      playing = true;
      tick();
      expect(stateB.failedHqAttempts).toBe(failures);

      // Actually observed HQ time does clear it.
      run(2, { healthy: true });
      expect(stateB.failedHqAttempts).toBe(0);
    });

    it('caps the escalating delay so recovery stays possible', () => {
      const { stateB } = setupUnsustainableLink();
      const required = (failures: number): number => {
        stateB.failedHqAttempts = failures;
        return (controller as unknown as {
          requiredHealthyMs(s: typeof stateB): number;
        }).requiredHealthyMs(stateB);
      };

      // f=0 is the ordinary first recovery after a one-off blip: no promotion has
      // failed yet, and anti-thrash is not engaged either, so the base dwell is
      // the real gate. From the first FAILED attempt the ladder is based on
      // antiThrashRetryMs, the floor it actually has to beat — a rung below that
      // floor can never bind and would be a silent no-op.
      expect(required(0)).toBe(config.performanceRecoveryDelayMs);
      expect(required(1)).toBe(config.antiThrashRetryMs * 2);
      expect(required(2)).toBe(config.maxPerformanceRecoveryDelayMs);

      // Unbounded doubling would run away to hours and then Infinity, which is a
      // permanent blacklist. The cap is what keeps recovery reachable.
      expect(config.performanceRecoveryDelayMs * 2 ** 20)
        .toBeGreaterThan(config.maxPerformanceRecoveryDelayMs);
      expect(required(20)).toBe(config.maxPerformanceRecoveryDelayMs);
      expect(required(200)).toBe(config.maxPerformanceRecoveryDelayMs);
      expect(Number.isFinite(required(200))).toBe(true);
    });

    it('keeps the escalated backoff across a resetAntiThrash() layout change', () => {
      const { stateB, run } = setupUnsustainableLink();

      run(60);
      const escalated = stateB.failedHqAttempts;
      expect(escalated).toBeGreaterThanOrEqual(2);

      // Layout churn wipes the anti-thrash brake. The backoff must survive it,
      // otherwise adding or removing a tile restarts the cycle from 15s.
      controller.registerCamera('cam-c');
      expect(stateB.antiThrash).toBe(false); // brake wiped, as designed
      expect(stateB.failedHqAttempts).toBe(escalated);

      controller.unregisterCamera('cam-c');
      expect(stateB.failedHqAttempts).toBe(escalated);
    });

    it('still returns to HQ when the network genuinely recovers for a sustained period', () => {
      const { stateB, run } = setupUnsustainableLink();

      run(60);
      expect(stateB.currentQuality).toBe('low');

      // The link is genuinely fixed. Even at the backoff cap the camera must come
      // back — this prevents futile retries, it does not blacklist cameras.
      const promotions = run(35, { healthy: true });
      expect(promotions.length).toBeGreaterThanOrEqual(1);
      expect(stateB.currentQuality).toBe('high');
    });

    it('clears the failure history after a sustained successful HQ period', () => {
      const { stateB, run } = setupUnsustainableLink();

      run(60);
      expect(stateB.failedHqAttempts).toBeGreaterThanOrEqual(2);

      // Genuine recovery: the camera regains HQ and holds it. A one-off bad spell
      // must not penalize it forever, so the history resets and a future blip
      // starts again from the base delay.
      run(35, { healthy: true });
      expect(stateB.currentQuality).toBe('high');
      expect(stateB.failedHqAttempts).toBe(0);
    });
  });

  describe('CLOUD-18327 follow-up: swap must not undo a performance demotion', () => {
    it('does not swap a Performance-LQ camera back to HQ even when it is far larger than the smallest HQ camera', () => {
      // cam-big is 150px tall — at or below smallItemHeightPx (171), so Pass 2
      // can never promote it whatever the dwell says, and neither can any
      // size-recovery branch. That leaves the swap path as the ONLY thing that
      // could move it, which is what this test is about. Its area is still
      // 3.75x cam-small's, so the swap ratio is comfortably met.
      const camBig = makeMockCamera({
        connectionKey: 'cam-big',
        elementHeight: 150,
        elementArea: 2000 * 150,
        viewportAreaFraction: 0.15,
        statsUpdateCount: 20,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      const camSmall = makeMockCamera({
        connectionKey: 'cam-small',
        elementHeight: 200,
        elementArea: 400 * 200,
        viewportAreaFraction: 0.15,
        statsUpdateCount: 20,
        snapshot: { mos: 5.0, focus: 3, stalled: false },
      });
      cameras.set('cam-big', camBig);
      cameras.set('cam-small', camSmall);
      controller.registerCamera('cam-big');
      controller.registerCamera('cam-small');

      // cam-big was demoted because the connection could not sustain HQ. The
      // reason is set up front, before any tick can offer a swap, so the swap
      // path never sees it under a different reason.
      const bigState = controller.getState('cam-big')!;
      const smallState = controller.getState('cam-small')!;
      bigState.currentQuality = 'low';
      bigState.lqReason = LqReason.Performance;

      // Long enough for cam-small to promote and for both cameras to clear the
      // switch cooldown, i.e. well past the point where a swap becomes possible.
      // cam-big's size has not changed, so the layout-driven swap would happily
      // promote it right back — reintroducing the load that caused the demotion.
      vi.advanceTimersByTime(2 * (config.switchCooldownMs + config.recentlyAddedDelayMs));

      expect(smallState.currentQuality).toBe('high');
      expect(bigState.currentQuality).toBe('low');
      expect(bigState.lqReason).toBe(LqReason.Performance);
    });
  });

  describe('CLOUD-18235: pause freezes RADASS (no demotions or promotions while paused)', () => {
    it('does NOT demote a HQ AUTO camera that becomes small while paused, then demotes on resume', () => {
      const cam = makeMockCamera({ connectionKey: 'cam-1', elementHeight: 400 });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      // Promote to HQ while playing.
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);
      tick();
      const state = controller.getState('cam-1')!;
      state.currentQuality = 'high';
      state.lqReason = LqReason.None;
      state.registeredAt = 0;
      state.lastSwitchTime = 0;

      // Pause, then shrink the tile below the small threshold.
      playing = false;
      cam.elementHeight = 150; // <= smallItemHeightPx (171)
      directives.clear();
      // Well beyond smallItemDelayMs: still no demotion, and no directive at all.
      vi.advanceTimersByTime(config.smallItemDelayMs + config.tickIntervalMs);
      tick(5);
      expect(state.currentQuality).toBe('high');
      expect(state.lqReason).toBe(LqReason.None);
      expect(directives.has('cam-1')).toBe(false);

      // Resume → the small tile is now demoted for size.
      playing = true;
      tick(); // sets smallSince
      vi.advanceTimersByTime(config.smallItemDelayMs);
      tick();
      expect(state.currentQuality).toBe('low');
      expect(state.lqReason).toBe(LqReason.SmallItem);
    });

    it('does NOT demote an existing HQ camera when a new camera is added while paused, then enforces the cap on resume', () => {
      config.maxConcurrentHighRes = 2;
      // Two HQ cameras exactly at the cap.
      for (let i = 0; i < 2; i++) {
        const cam = makeMockCamera({ connectionKey: `cam-${i}`, elementHeight: 400, elementArea: (i + 1) * 100_000 });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
        const s = controller.getState(`cam-${i}`)!;
        s.currentQuality = 'high'; s.lqReason = LqReason.None; s.registeredAt = 0; s.lastSwitchTime = 0;
      }
      tick();
      expect(controller.getState('cam-0')!.currentQuality).toBe('high');
      expect(controller.getState('cam-1')!.currentQuality).toBe('high');

      // Pause, then add a 3rd camera (the CLOUD-18235 repro-2 trigger).
      playing = false;
      const cam2 = makeMockCamera({ connectionKey: 'cam-2', elementHeight: 400, elementArea: 300_000 });
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-2');
      controller.getState('cam-2')!.registeredAt = 0;

      directives.clear();
      vi.advanceTimersByTime(config.recentlyAddedDelayMs + config.switchCooldownMs);
      tick(5);

      // While paused: new camera is not promoted, cap is never exceeded, nothing
      // is demoted, and the controller issues no directives at all.
      expect(controller.getState('cam-0')!.currentQuality).toBe('high');
      expect(controller.getState('cam-1')!.currentQuality).toBe('high');
      expect(controller.getState('cam-2')!.currentQuality).toBe('low');
      expect(directives.size).toBe(0);

      // Resume → cam-2 promotes, cap now exceeded → exactly one HQ demoted (cap holds).
      playing = true;
      controller.getState('cam-2')!.lastSwitchTime = 0;
      tick(3);
      const highCount = ['cam-0', 'cam-1', 'cam-2'].filter(
        (k) => controller.getState(k)!.currentQuality === 'high',
      ).length;
      expect(highCount).toBe(2);
    });

    it('still honors an explicit HIGH target while paused', () => {
      const cam = makeMockCamera({ connectionKey: 'cam-1', targetStream: TargetStream.HIGH, elementHeight: 400 });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');

      playing = false;
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);
      tick();

      expect(directives.get('cam-1')).toBe('high');
      expect(controller.getState('cam-1')!.currentQuality).toBe('high');
    });

    it('still honors an explicit LOW target while paused', () => {
      const cam = makeMockCamera({ connectionKey: 'cam-1', targetStream: TargetStream.LOW, elementHeight: 400 });
      cameras.set('cam-1', cam);
      controller.registerCamera('cam-1');
      // Start it HQ so applying LOW is a visible change.
      const state = controller.getState('cam-1')!;
      state.currentQuality = 'high';
      state.registeredAt = 0;

      playing = false;
      vi.advanceTimersByTime(config.recentlyAddedDelayMs);
      tick();

      expect(directives.get('cam-1')).toBe('low');
      expect(state.currentQuality).toBe('low');
      expect(state.lqReason).toBe(LqReason.Manual);
    });
  });

  describe('CLOUD-18303: constraint-based LQ tiles recover in the 171-230 band when the constraint clears', () => {
    it('promotes a CapExceeded tile (height in the 171-230 band) once the cap has room again', () => {
      config.maxConcurrentHighRes = 2;
      // 3 tiles, all sub-hysteresis (200px) but not small, all HQ → smallest is CapExceeded.
      for (let i = 0; i < 3; i++) {
        const cam = makeMockCamera({ connectionKey: `cam-${i}`, elementHeight: 200, elementArea: (i + 1) * 100_000 });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
        const s = controller.getState(`cam-${i}`)!;
        s.currentQuality = 'high'; s.registeredAt = 0; s.lastSwitchTime = 0;
      }
      tick();
      const cam0 = controller.getState('cam-0')!; // smallest area → CapExceeded
      expect(cam0.currentQuality).toBe('low');
      expect(cam0.lqReason).toBe(LqReason.CapExceeded);

      // Remove one HQ tile → the cap now has room.
      cameras.delete('cam-1');
      controller.unregisterCamera('cam-1');

      vi.advanceTimersByTime(config.switchCooldownMs);
      cam0.lastSwitchTime = 0;
      tick(3);

      // 200px is in the 171-230 band. It was demoted for the cap, not its size,
      // so it must recover now that the cap has room.
      expect(cam0.currentQuality).toBe('high');
      expect(cam0.lqReason).toBe(LqReason.None);
    });

    it('promotes an InheritedLq tile (height in the 171-230 band) once the inherited cap constraint is gone', () => {
      config.maxConcurrentHighRes = 2;
      for (let i = 0; i < 3; i++) {
        const cam = makeMockCamera({ connectionKey: `cam-${i}`, elementHeight: 200, elementArea: (i + 1) * 100_000 });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
        const s = controller.getState(`cam-${i}`)!;
        s.currentQuality = 'high'; s.registeredAt = 0; s.lastSwitchTime = 0;
      }
      tick(); // cam-0 → CapExceeded
      expect(controller.getState('cam-0')!.lqReason).toBe(LqReason.CapExceeded);

      // Add cam-3 while a CapExceeded tile exists → it inherits LQ.
      const cam3 = makeMockCamera({ connectionKey: 'cam-3', elementHeight: 200, elementArea: 100_000 });
      cameras.set('cam-3', cam3);
      controller.registerCamera('cam-3');
      const cam3s = controller.getState('cam-3')!;
      cam3s.registeredAt = 0;
      expect(cam3s.lqReason).toBe(LqReason.InheritedLq);

      // Remove both HQ tiles → the cap has room for both LQ tiles.
      cameras.delete('cam-1');
      controller.unregisterCamera('cam-1');
      cameras.delete('cam-2');
      controller.unregisterCamera('cam-2');

      vi.advanceTimersByTime(config.switchCooldownMs + config.recentlyAddedDelayMs);
      controller.getState('cam-0')!.lastSwitchTime = 0;
      cam3s.lastSwitchTime = 0;
      tick(5);

      expect(controller.getState('cam-0')!.currentQuality).toBe('high');
      expect(cam3s.currentQuality).toBe('high');
      expect(cam3s.lqReason).toBe(LqReason.None);
    });

    it('promotes a TooManyItems tile (height in the 171-230 band) once the camera count drops below the limit', () => {
      config.maxCamerasBeforeForceLq = 2;
      // cam-0, cam-1 fill the limit; cam-2 (registered at size == limit) → TooManyItems.
      for (let i = 0; i < 2; i++) {
        const cam = makeMockCamera({ connectionKey: `cam-${i}`, elementHeight: 200 });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
        controller.getState(`cam-${i}`)!.registeredAt = 0;
      }
      const cam2 = makeMockCamera({ connectionKey: 'cam-2', elementHeight: 200 });
      cameras.set('cam-2', cam2);
      controller.registerCamera('cam-2');
      const cam2s = controller.getState('cam-2')!;
      cam2s.registeredAt = 0;
      expect(cam2s.lqReason).toBe(LqReason.TooManyItems);

      // Drop the count below the limit.
      cameras.delete('cam-0');
      controller.unregisterCamera('cam-0');
      cameras.delete('cam-1');
      controller.unregisterCamera('cam-1');

      vi.advanceTimersByTime(config.switchCooldownMs);
      cam2s.lastSwitchTime = 0;
      tick(3);

      expect(cam2s.currentQuality).toBe('high');
      expect(cam2s.lqReason).toBe(LqReason.None);
    });

    it('does NOT churn a CapExceeded band tile while the cap stays full (headroom gate)', () => {
      config.maxConcurrentHighRes = 2;
      for (let i = 0; i < 3; i++) {
        const cam = makeMockCamera({ connectionKey: `cam-${i}`, elementHeight: 200, elementArea: (i + 1) * 100_000 });
        cameras.set(`cam-${i}`, cam);
        controller.registerCamera(`cam-${i}`);
        const s = controller.getState(`cam-${i}`)!;
        s.currentQuality = 'high'; s.registeredAt = 0; s.lastSwitchTime = 0;
      }
      tick(); // cam-0 (smallest) → CapExceeded, cap full (2 HQ), no room.
      const cam0 = controller.getState('cam-0')!;
      expect(cam0.currentQuality).toBe('low');
      expect(cam0.lqReason).toBe(LqReason.CapExceeded);

      // Cap stays full. Clear the settle-demotion timestamp, satisfy the cooldown,
      // and tick. Without the headroom gate the tile would promote (Cap recovery)
      // and Check 8 would re-demote it in the same tick — a start/abort HQ churn
      // that leaves a nonzero lastSwitchTime. The gate must prevent the promotion
      // entirely, so the tile is never switched.
      cam0.lastSwitchTime = 0;
      vi.advanceTimersByTime(config.switchCooldownMs + config.tickIntervalMs);
      tick();

      expect(cam0.currentQuality).toBe('low');
      expect(cam0.lqReason).toBe(LqReason.CapExceeded);
      expect(cam0.lastSwitchTime).toBe(0);
    });
  });
});
