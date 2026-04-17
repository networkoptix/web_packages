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

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'performance'] });
    cameras = new Map();
    directives = new Map();
    config = { ...DEFAULT_RADASS_CONFIG };

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

      tick();
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

      // Recovery: cam-1 gets good MOS, cam-2 recovers
      cam1.snapshot = { mos: 5.0, focus: 3, stalled: false };
      state2.lastSwitchTime = 0; // clear cooldown
      tick();
      // cam-2 should be promoted back
      expect(state2.currentQuality).toBe('high');

      // Second demotion: cam-1 bad MOS again → cam-2 demoted again
      cam1.snapshot = { mos: 2.0, focus: 3, stalled: false };
      state2.lastSwitchTime = 0;
      tick();
      expect(state2.lqReason).toBe(LqReason.Performance);

      // Now anti-thrash should be set — no more auto promotions
      cam1.snapshot = { mos: 5.0, focus: 3, stalled: false };
      state2.lastSwitchTime = 0;
      tick();
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
      const bigLq = makeMockCamera({
        connectionKey: 'cam-big',
        elementArea: 600_000,
        elementHeight: 600,
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
      bigState.lqReason = LqReason.Performance;
      bigState.lastSwitchTime = 0;
      bigState.registeredAt = 0;
      controller.getState('cam-small')!.currentQuality = 'high';
      controller.getState('cam-small')!.registeredAt = 0;
      controller.getState('cam-small')!.lastSwitchTime = 0;

      tick();

      const smallState = controller.getState('cam-small')!;
      expect(smallState.lqReason).toBe(LqReason.Performance);
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

      // Tick to promote cam-1 back (Performance recovery)
      tick();
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

      // Step 2: cam1 MOS good, cam3 recovers
      cam1.snapshot = { mos: 5.0, focus: 3, stalled: false };
      state3.lastSwitchTime = 0;
      tick();
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

      // Promote back
      cam1.snapshot = { mos: 5.0, focus: 3, stalled: false };
      state2.lastSwitchTime = 0;
      tick();
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

      // Advance past antiThrashRetryMs
      vi.advanceTimersByTime(config.antiThrashRetryMs);

      // Now cam2 should recover (anti-thrash cleared, MOS is good)
      state2.lastSwitchTime = 0;
      tick();
      expect(state2.currentQuality).toBe('high');
      expect(state2.antiThrash).toBe(false);
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
});
