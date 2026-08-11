// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QualityMonitor, QualitySnapshot } from '../../src/strategies/quality-monitor';

describe('QualityMonitor', () => {
  let monitor: QualityMonitor;

  beforeEach(() => {
    monitor = new QualityMonitor();
  });

  afterEach(async () => {
    await monitor.dispose();
  });

  it('returns default snapshot (mos=5, focus=0, stalled=false)', () => {
    const snap = monitor.snapshot();
    expect(snap).toEqual<QualitySnapshot>({ mos: 5, focus: 0, stalled: false });
  });

  it('calculates focus from element dimensions', () => {
    // Set viewport to 800x600
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });

    const el = document.createElement('video');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      x: 200,
      y: 100,
      width: 400,
      height: 400,
      top: 100,
      right: 600,
      bottom: 500,
      left: 200,
      toJSON: () => {},
    });

    monitor.setVideoElement(el);
    monitor.updateFocus();

    const snap = monitor.snapshot();
    // Centered large element (400x400 in 800x600 viewport, perfectly centered)
    // positionScore = 1 + 1 = 2, sizeScore = 160000/480000 = 1/3
    // focusScore = min(10 * 2 * 1/3, 6) = 6, normalized = 6 / 1.2 = 5
    expect(snap.focus).toBe(5);
  });

  it('updates MOS from good stats (mos > 4)', () => {
    // rtt=50ms, loss=0%, jitter=10ms
    // effectiveLatency = 50 + 20 + 10 = 80
    // R = 93.2 - 80/40 = 91.2
    // mos ~ 4.37
    monitor.updateMos({ rtt: 0.05, packetLoss: 0, jitter: 0.01 });
    const snap = monitor.snapshot();
    expect(snap.mos).toBeGreaterThan(4);
  });

  it('updates MOS from bad stats (mos < 3)', () => {
    // rtt=500ms, loss=10%, jitter=100ms
    // effectiveLatency = 500 + 200 + 10 = 710
    // R = 93.2 - (710-120)/10 = 34.2 - 25 = 9.2
    // mos ~ 1.03
    monitor.updateMos({ rtt: 0.5, packetLoss: 0.1, jitter: 0.1 });
    const snap = monitor.snapshot();
    expect(snap.mos).toBeLessThan(3);
  });

  describe('stall detection', () => {
    let fakeNow: number;

    beforeEach(() => {
      fakeNow = 0;
      vi.useFakeTimers();
      vi.spyOn(performance, 'now').mockImplementation(() => fakeNow);
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it('detects stall when same bytes for >1s', () => {
      // Record initial bytes at t=0
      monitor.recordBytesReceived(100);
      expect(monitor.snapshot().stalled).toBe(false);

      // Advance past the 1s stall threshold
      fakeNow = 1100;

      expect(monitor.snapshot().stalled).toBe(true);
    });

    it('clears stall when bytes resume', () => {
      // Record initial bytes at t=0
      monitor.recordBytesReceived(100);

      // Advance past stall threshold
      fakeNow = 1100;
      expect(monitor.snapshot().stalled).toBe(true);

      // New bytes arrive — totalBytes increased
      monitor.recordBytesReceived(200);
      expect(monitor.snapshot().stalled).toBe(false);
    });
  });

  describe('element accessors', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
    });

    it('getElementHeight returns 0 when no video element', () => {
      expect(monitor.getElementHeight()).toBe(0);
    });

    it('getElementHeight returns element rendered height', () => {
      const el = document.createElement('video');
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        x: 0, y: 0, width: 640, height: 480,
        top: 0, right: 640, bottom: 480, left: 0, toJSON: () => {},
      });
      monitor.setVideoElement(el);
      expect(monitor.getElementHeight()).toBe(480);
    });

    it('getElementArea returns width * height', () => {
      const el = document.createElement('video');
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        x: 0, y: 0, width: 640, height: 480,
        top: 0, right: 640, bottom: 480, left: 0, toJSON: () => {},
      });
      monitor.setVideoElement(el);
      expect(monitor.getElementArea()).toBe(640 * 480);
    });

    it('getViewportAreaFraction returns element area / viewport area', () => {
      const el = document.createElement('video');
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        x: 0, y: 0, width: 960, height: 540,
        top: 0, right: 960, bottom: 540, left: 0, toJSON: () => {},
      });
      monitor.setVideoElement(el);
      // 960*540 / 1920*1080 = 518400 / 2073600 = 0.25
      expect(monitor.getViewportAreaFraction()).toBeCloseTo(0.25);
    });
  });

  describe('updateStats', () => {
    it('feeds MOS from interval-based packet loss', () => {
      monitor.updateStats({
        rtt: 0.05, jitter: 0.01,
        packetsReceived: 100, packetsLost: 2,
        bytesReceived: 5000,
      });
      const snap1 = monitor.snapshot();
      expect(snap1.mos).toBeGreaterThan(4);
    });

    it('computes delta-based loss between intervals', () => {
      // Baseline: 100 received, 0 lost
      monitor.updateStats({
        rtt: 0.05, jitter: 0.01,
        packetsReceived: 100, packetsLost: 0,
        bytesReceived: 5000,
      });

      // Second interval: 10 more received, 10 lost (50% interval loss!)
      monitor.updateStats({
        rtt: 0.05, jitter: 0.01,
        packetsReceived: 110, packetsLost: 10,
        bytesReceived: 10000,
      });
      const snap2 = monitor.snapshot();
      // 50% interval loss degrades quality significantly (MOS ~2.79)
      expect(snap2.mos).toBeLessThan(3);
    });

    it('skips the MOS update when the counters go backwards (peer-connection swap)', () => {
      // Establish a baseline, then a heavily lossy interval → MOS is bad.
      monitor.updateStats({
        rtt: 0.05, jitter: 0.01,
        packetsReceived: 900, packetsLost: 100,
        bytesReceived: 5000,
      });
      monitor.updateStats({
        rtt: 0.05, jitter: 0.01,
        packetsReceived: 1000, packetsLost: 200,
        bytesReceived: 10000,
      });
      const lossyMos = monitor.snapshot().mos;
      expect(lossyMos).toBeLessThan(3);

      // The active PC swaps: the new PC's cumulative counters start near zero, so
      // both deltas go negative. That must not be read as a zero-loss interval —
      // the resulting falsely-healthy MOS is what drives RADASS oscillation.
      monitor.updateStats({
        rtt: 0.05, jitter: 0.01,
        packetsReceived: 180, packetsLost: 20,
        bytesReceived: 900,
      });
      expect(monitor.snapshot().mos).toBe(lossyMos);
    });

    it('resetStatsDeltas() does not read a long-lived PC\'s lifetime average as one interval', () => {
      // The demote path is the dangerous one: the base PC has been running all
      // session, so its cumulative counters are huge and its LIFETIME loss ratio
      // is low even while the CURRENT interval is badly congested. A baseline
      // seeded at zero would diff against those cumulative totals and read the
      // lifetime average — falsely healthy, exactly the H2 failure mode.
      monitor.updateStats({
        rtt: 0.05, jitter: 0.01,
        packetsReceived: 100, packetsLost: 100,
        bytesReceived: 900,
      });
      const beforeSwap = monitor.snapshot().mos;
      expect(beforeSwap).toBeLessThan(3);

      // Active PC swaps to the long-lived base PC: ~1 % loss over its lifetime,
      // but the link is congested right now. The first post-swap sample carries
      // no interval information at all, so it must not move MOS.
      monitor.resetStatsDeltas();
      monitor.updateStats({
        rtt: 0.05, jitter: 0.01,
        packetsReceived: 3_000_000, packetsLost: 30_000,
        bytesReceived: 900_000_000,
      });
      expect(monitor.snapshot().mos).toBe(beforeSwap);

      // The next sample is a true interval against the new baseline: 150 lost of
      // 1000 = 15 % loss, and that is what MOS must reflect.
      monitor.updateStats({
        rtt: 0.05, jitter: 0.01,
        packetsReceived: 3_000_850, packetsLost: 30_150,
        bytesReceived: 900_500_000,
      });
      expect(monitor.snapshot().mos).toBeLessThan(3.5);
    });

    it('records bytes for stall detection', () => {
      vi.useFakeTimers();
      const fakeNow = vi.spyOn(performance, 'now');
      fakeNow.mockReturnValue(0);

      monitor.updateStats({
        rtt: 0.05, jitter: 0.01,
        packetsReceived: 100, packetsLost: 0,
        bytesReceived: 5000,
      });
      expect(monitor.snapshot().stalled).toBe(false);

      // Same bytes after 1.1s
      fakeNow.mockReturnValue(1100);
      monitor.updateStats({
        rtt: 0.05, jitter: 0.01,
        packetsReceived: 100, packetsLost: 0,
        bytesReceived: 5000, // same!
      });
      expect(monitor.snapshot().stalled).toBe(true);

      vi.restoreAllMocks();
      vi.useRealTimers();
    });
  });

  it('cleans up on dispose', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });

    const el = document.createElement('video');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      x: 200,
      y: 100,
      width: 400,
      height: 400,
      top: 100,
      right: 600,
      bottom: 500,
      left: 200,
      toJSON: () => {},
    });

    monitor.setVideoElement(el);
    monitor.updateFocus();
    monitor.updateMos({ rtt: 0.05, packetLoss: 0, jitter: 0.01 });
    monitor.recordBytesReceived(100);

    await monitor.dispose();

    expect(monitor.disposed).toBe(true);
    // After disposal, video element reference is cleared;
    // updateFocus without an element is a no-op so focus remains at last value.
    // The key verification is that dispose completes without error
    // and the AbortSignal is aborted.
    expect(monitor.signal.aborted).toBe(true);
  });
});
