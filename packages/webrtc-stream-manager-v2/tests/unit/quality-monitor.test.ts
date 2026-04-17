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
