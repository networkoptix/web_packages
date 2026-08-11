// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Disposable } from '../core/disposable';

// ─── Public interface ─────────────────────────────────────────────────────────

/** Synchronous snapshot of current stream quality metrics. */
export interface QualitySnapshot {
  /** Mean Opinion Score (ITU-T E-model simplified), clamped to [1, 5]. */
  mos: number;
  /** Focus score based on element position/size in viewport, range [0, 5]. */
  focus: number;
  /** True when no new bytes have been received for more than 1 second. */
  stalled: boolean;
}

/** Input for the ITU-T E-model MOS calculation. All values in seconds / fractions. */
export interface MosInput {
  /** Round-trip time in seconds. */
  rtt: number;
  /** Packet loss as a fraction (0 = 0 %, 1 = 100 %). */
  packetLoss: number;
  /** Jitter in seconds. */
  jitter: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Stall is detected when no new bytes arrive for longer than this (ms). */
const STALL_THRESHOLD_MS = 1_000;

/** Upper bound for focus normalization (mirrors v1 default). */
const FOCUS_UPPER_BOUND = 6;

/** Hard cap on the upper-bound parameter (mirrors v1 cap). */
const FOCUS_UPPER_BOUND_CAP = 20;

// ─── QualityMonitor ───────────────────────────────────────────────────────────

/**
 * Consolidates MOS score tracking, viewport focus tracking, and stall
 * detection (bytes-received monitoring) into a single `Disposable` class.
 *
 * All heavy lifting happens inside explicit `update*` / `record*` calls so
 * that `snapshot()` stays synchronous and allocation-free — ideal for the
 * global quality optimizer's hot path.
 */
export class QualityMonitor extends Disposable {
  // ── MOS state ───────────────────────────────────────────────────────────
  private currentMos = 5;

  // ── Focus state ─────────────────────────────────────────────────────────
  private currentFocus = 0;
  private videoElement: HTMLVideoElement | undefined;

  // ── Stall-detection state ───────────────────────────────────────────────
  private lastBytes: number | undefined;
  private lastBytesChangedAt: number | undefined;

  // ── Stats delta tracking ──────────────────────────────────────────────
  private prevPacketsLost = 0;
  private prevPacketsReceived = 0;
  private statsUpdateCount = 0;
  private rebaseNextSample = false;

  // ── Public API ──────────────────────────────────────────────────────────

  /** Number of stats updates received. Used to gate performance decisions. */
  getStatsUpdateCount(): number {
    return this.statsUpdateCount;
  }

  /**
   * Rebase the packet-delta baseline. Call this whenever the peer connection
   * that feeds `updateStats()` is replaced (HQ upgrade / LQ downgrade): the two
   * PCs carry independent cumulative counters, so diffing across the swap
   * produces a meaningless loss ratio.
   *
   * The next sample is *skipped* rather than diffed against a zero baseline.
   * Zero-seeding would make the first sample read the new PC's entire lifetime
   * average as if it were one interval — on a downgrade the base PC has run all
   * session, so a genuinely congested link would report its low lifetime ratio
   * and look healthy. One skipped sample (~1 s) is the correct cost: a swap
   * boundary carries no interval information.
   *
   * `statsUpdateCount` is deliberately left alone — it gates how much history
   * RADASS has for this camera, which a swap does not invalidate.
   */
  resetStatsDeltas(): void {
    this.rebaseNextSample = true;
  }

  /** Return a synchronous snapshot of the current quality state. */
  snapshot(): QualitySnapshot {
    return {
      mos: this.currentMos,
      focus: this.currentFocus,
      stalled: this.isStalled(),
    };
  }

  /** Assign the video element used for focus tracking. */
  setVideoElement(el: HTMLVideoElement): void {
    this.videoElement = el;
  }

  /**
   * Recalculate focus from the current video element's position and size
   * relative to the viewport.  No-op if no element has been set.
   */
  updateFocus(): void {
    if (!this.videoElement) return;
    this.currentFocus = this.calculateFocus(this.videoElement);
  }

  /** Raw rendered height of the video element in pixels. Returns 0 if no element set. */
  getElementHeight(): number {
    if (!this.videoElement) return 0;
    return this.videoElement.getBoundingClientRect().height;
  }

  /** Raw rendered area of the video element in pixels². Returns 0 if no element set. */
  getElementArea(): number {
    if (!this.videoElement) return 0;
    const rect = this.videoElement.getBoundingClientRect();
    return rect.width * rect.height;
  }

  /** Element area as a fraction of viewport area (0 to 1). Returns 0 if no element set. */
  getViewportAreaFraction(): number {
    if (!this.videoElement) return 0;
    const rect = this.videoElement.getBoundingClientRect();
    return (rect.width * rect.height) / (window.innerWidth * window.innerHeight);
  }

  /**
   * Update MOS and bytes-received from cumulative RTCStats values.
   * Computes interval-based packet loss from deltas between calls.
   */
  updateStats(stats: {
    rtt: number;
    jitter: number;
    packetsLost: number;
    packetsReceived: number;
    bytesReceived: number;
  }): void {
    this.statsUpdateCount++;
    const deltaLost = stats.packetsLost - this.prevPacketsLost;
    const deltaReceived = stats.packetsReceived - this.prevPacketsReceived;

    // Skip any sample that does not describe a real interval on a single PC:
    // either an explicit rebase after a known swap, or a negative delta, which
    // means the counters went backwards and the sample came from a different PC
    // than the previous one (a missed rebase). Either way, resync the baseline
    // and leave MOS untouched rather than computing a loss ratio from two
    // unrelated counter series — the bogus result reads as a healthy MOS and
    // drives RADASS oscillation.
    if (this.rebaseNextSample || deltaLost < 0 || deltaReceived < 0) {
      this.rebaseNextSample = false;
      this.prevPacketsLost = stats.packetsLost;
      this.prevPacketsReceived = stats.packetsReceived;
      this.recordBytesReceived(stats.bytesReceived);
      return;
    }

    const deltaTotal = deltaLost + deltaReceived;
    const intervalLoss = deltaTotal > 0 ? deltaLost / deltaTotal : 0;

    this.prevPacketsLost = stats.packetsLost;
    this.prevPacketsReceived = stats.packetsReceived;

    this.updateMos({ rtt: stats.rtt, jitter: stats.jitter, packetLoss: intervalLoss });
    this.recordBytesReceived(stats.bytesReceived);
  }

  /**
   * Compute MOS using the ITU-T E-model simplified formula.
   *
   * Input values use *seconds* for RTT / jitter and a *fraction* (0-1) for
   * packet loss.  They are converted to milliseconds / percent internally.
   *
   * @internal Prefer `updateStats()` for production use — this is kept public
   * for direct unit testing of the E-model formula.
   */
  updateMos(input: MosInput): void {
    const rttMs = input.rtt * 1_000;
    const jitterMs = input.jitter * 1_000;
    const lossPercent = input.packetLoss * 100;

    const effectiveLatency = rttMs + jitterMs * 2 + 10;

    let R: number;
    if (effectiveLatency < 160) {
      R = 93.2 - effectiveLatency / 40;
    } else {
      R = 93.2 - (effectiveLatency - 120) / 10;
    }

    R -= lossPercent * 2.5;

    const mos = 1 + 0.035 * R + R * (R - 60) * (100 - R) * 7e-6;
    this.currentMos = Math.max(1, Math.min(5, mos));
  }

  /**
   * Record the cumulative bytes received so far.  If `totalBytes` has not
   * increased since the previous call, the "last changed" timestamp is *not*
   * updated — which eventually causes `isStalled()` to return `true`.
   */
  recordBytesReceived(totalBytes: number): void {
    if (this.lastBytes === undefined || totalBytes > this.lastBytes) {
      this.lastBytesChangedAt = performance.now();
    }
    this.lastBytes = totalBytes;
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  protected override onAfterAbort(): void {
    this.videoElement = undefined;
    this.lastBytes = undefined;
    this.lastBytesChangedAt = undefined;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /** True when bytes tracking has started and no increase for > 1 s. */
  private isStalled(): boolean {
    if (this.lastBytesChangedAt === undefined) return false;
    return performance.now() - this.lastBytesChangedAt > STALL_THRESHOLD_MS;
  }

  /**
   * Compute a focus score for `element` within the current viewport.
   *
   * The algorithm mirrors the v1 `calculateElementFocus` utility:
   *
   * 1. **Position score** — how close the element center is to the viewport
   *    center (max 2 when perfectly centered).
   * 2. **Size score** — element area as a fraction of the viewport area.
   * 3. **Raw focus** = `10 * positionScore * sizeScore`, clamped to
   *    `[0, upperBound]`.
   * 4. **Normalized** to `[0, 5]` via `raw / (upperBound / 5)`.
   */
  private calculateFocus(
    element: HTMLVideoElement,
    upperBound: number = FOCUS_UPPER_BOUND,
  ): number {
    const { innerHeight, innerWidth } = window;
    const xMid = innerWidth / 2;
    const yMid = innerHeight / 2;
    const {
      width = xMid,
      height = yMid,
      y = yMid,
      x = xMid,
    } = element?.getBoundingClientRect() ?? {};

    // --- position score ---
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const deviation = (val: number): number => 1 - Math.abs(val - 0.5);
    const relativeX = deviation(centerX / innerWidth);
    const relativeY = deviation(centerY / innerHeight);
    const positionScore = relativeX + relativeY;

    // --- size score ---
    const sizeScore = (width * height) / (innerWidth * innerHeight);

    // --- normalize ---
    const clampedBound = Math.min(upperBound, FOCUS_UPPER_BOUND_CAP);
    const focusScore = Math.min(10 * positionScore * sizeScore, clampedBound);
    return focusScore / (clampedBound / 5);
  }
}
