// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { Disposable } from '../core/disposable';
import { TargetStream } from '../types';
import type { QualitySnapshot } from './quality-monitor';
import {
  LqReason,
  type CameraRadassState,
  type RadassConfig,
} from './radass-types';

// ─── Camera info interface ────────────────────────────────────────────────────

/** Read-only snapshot of a camera's current state, provided by the host (StreamManager). */
export interface CameraInfo {
  targetStream: TargetStream;
  snapshot: QualitySnapshot;
  elementHeight: number;
  elementArea: number;
  viewportAreaFraction: number;
  canAutoUpgrade: boolean;
  /** Number of stats updates received by this camera's quality monitor. */
  statsUpdateCount: number;
}

/** Callback interface for the controller to read camera state and apply decisions. */
export interface RadassHost {
  /** Read current camera info. Returns null if the camera was removed. */
  getCameraInfo(connectionKey: string): CameraInfo | null;
  /** Apply a quality directive to a camera. */
  applyDirective(connectionKey: string, quality: 'high' | 'low'): void;
  /** Whether playback is currently playing. When paused, RADASS freezes all
   *  adaptive decisions (no promotions or demotions). See CLOUD-18235. */
  isPlaying(): boolean;
}

// ─── RadassController ─────────────────────────────────────────────────────────

export class RadassController extends Disposable {
  private readonly states = new Map<string, CameraRadassState>();

  /**
   * Accumulated milliseconds of *observed* system-wide healthy MOS, reset to 0
   * the moment any camera reports bad MOS. Gates performance promotion — see
   * the dwell comment in tick(). System-wide by nature, so it is a single
   * controller field rather than per-camera state: Pass 1 demotes on the global
   * bad-MOS signal, so recovery is judged globally too.
   */
  private healthyMs = 0;

  constructor(
    private readonly config: RadassConfig,
    private readonly host: RadassHost,
  ) {
    super();
    this.setInterval(() => this.tick(), config.tickIntervalMs);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  registerCamera(connectionKey: string): void {
    const now = performance.now();
    const state: CameraRadassState = {
      connectionKey,
      currentQuality: 'low',
      lqReason: LqReason.None,
      lastSwitchTime: 0,
      smallSince: null,
      registeredAt: now,
      antiThrash: false,
      antiThrashAt: 0,
      performancePromotionPending: false,
      failedHqAttempts: 0,
      hqMs: 0,
    };

    // Check 5: Camera count enforcement (>16 cameras → force LQ)
    if (this.states.size >= this.config.maxCamerasBeforeForceLq) {
      state.lqReason = LqReason.TooManyItems;
      this.states.set(connectionKey, state);
      this.resetAntiThrash();
      return;
    }

    // Check 6: Inherit LQ from struggling cameras
    const hasNonSizeLq = [...this.states.values()].some(
      (s) =>
        s.currentQuality === 'low' &&
        s.lqReason !== LqReason.SmallItem &&
        s.lqReason !== LqReason.None &&
        s.lqReason !== LqReason.Manual,
    );
    if (hasNonSizeLq) {
      state.lqReason = LqReason.InheritedLq;
    }

    this.states.set(connectionKey, state);
    this.resetAntiThrash();
  }

  unregisterCamera(connectionKey: string): void {
    this.states.delete(connectionKey);
    // Reset anti-thrash on unregistration (matches desktop)
    this.resetAntiThrash();
  }

  getState(connectionKey: string): CameraRadassState | undefined {
    return this.states.get(connectionKey);
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  protected override onAfterAbort(): void {
    this.states.clear();
  }

  // ── Tick loop ───────────────────────────────────────────────────────────

  private tick(): void {
    if (this.disposed) return;

    const now = performance.now();
    const playing = this.host.isPlaying();

    // Pre-fetch camera info for the entire tick to avoid repeated getBoundingClientRect() calls
    const infoCache = new Map<string, CameraInfo | null>();
    for (const [key] of this.states) {
      infoCache.set(key, this.host.getCameraInfo(key));
    }

    // ── Check 7: Per-camera anti-thrash recovery ─────────────────────
    // Skipped while paused: clearing the flag off stale/paused MOS would just
    // churn state, and promotions are frozen while paused anyway (CLOUD-18235).
    if (playing) {
      for (const [k, state] of this.states) {
        if (!state.antiThrash) continue;
        if (now - state.antiThrashAt < this.config.antiThrashRetryMs) continue;
        // Only reset if this camera doesn't currently have bad MOS
        const info = infoCache.get(k) ?? null;
        if (info && info.snapshot.mos < this.config.mosThreshold) continue;
        state.antiThrash = false;
        state.antiThrashAt = 0;
      }
    }

    let switchedThisTick = false;

    for (const [key, state] of this.states) {
      const info = infoCache.get(key) ?? null;
      if (!info) continue;

      // ── Check 1: Forced states ──────────────────────────────────────
      // Explicit HIGH is the user's choice — honored even while paused.
      if (info.targetStream === TargetStream.HIGH) {
        // An explicit user HIGH is a fresh intent: forget the automatic backoff
        // history so a later return to Auto starts from the base delay.
        state.failedHqAttempts = 0;
        this.setQuality(state, 'high', LqReason.None, now);
        this.host.applyDirective(key, 'high');
        continue;
      }

      // Viewport-force is an *adaptive* promotion (a large tile → HQ), so it is
      // suppressed while paused just like every other auto decision below.
      if (playing && info.viewportAreaFraction > this.config.forceHighViewportFraction) {
        this.setQuality(state, 'high', LqReason.None, now);
        this.host.applyDirective(key, 'high');
        continue;
      }

      // Explicit LOW is the user's choice — honored even while paused.
      if (info.targetStream === TargetStream.LOW) {
        this.setQuality(state, 'low', LqReason.Manual, now);
        this.host.applyDirective(key, 'low');
        continue;
      }

      // ── Pause freeze (CLOUD-18235) ──────────────────────────────────
      // While paused, freeze every adaptive quality decision: no size /
      // performance / cap demotions and no promotions. Only the explicit
      // HIGH/LOW targets above are honored. Streams are DC-paused on pause so
      // adaptive signals are moot, and pausing must never demote an HQ tile.
      // Leaving currentQuality/lqReason untouched keeps controller state
      // consistent with what is on screen; the next playing tick re-evaluates.
      // (Desktop gates each auto decision individually on isMediaPaused(); the
      // web freezes the whole adaptive pass because it also DC-pauses streams.)
      if (!playing) {
        continue;
      }

      // targetStream is AUTO here (HIGH and LOW both `continue` above). If the
      // camera was pinned to low by a manual LOW selection and the user has now
      // switched back to Auto, clear the sticky Manual reason so the auto checks
      // below (initial promotion, size, performance) can re-evaluate it. Without
      // this, LqReason.Manual matches no promotion branch and the camera stays
      // low forever after Low → Auto (CLOUD-18038).
      if (state.lqReason === LqReason.Manual) {
        state.lqReason = LqReason.None;
      }

      if (!info.canAutoUpgrade) {
        this.host.applyDirective(key, state.currentQuality);
        continue;
      }

      // ── Recently-added grace period ─────────────────────────────────
      if (now - state.registeredAt < this.config.recentlyAddedDelayMs) {
        this.host.applyDirective(key, state.currentQuality);
        continue;
      }

      // ── Check 2: Size-based switching ───────────────────────────────
      if (info.elementHeight <= this.config.smallItemHeightPx) {
        // Track how long the item has been small
        if (state.smallSince === null) {
          state.smallSince = now;
        }
        // Only switch after the delay
        if (
          state.currentQuality === 'high' &&
          now - state.smallSince >= this.config.smallItemDelayMs
        ) {
          if (!switchedThisTick) {
            this.setQuality(state, 'low', LqReason.SmallItem, now);
            this.host.applyDirective(key, 'low');
            this.resetAntiThrash(); // small-item switches reset anti-thrash
            switchedThisTick = true;
            continue;
          }
        }
      } else {
        state.smallSince = null; // No longer small

        // Initial evaluation: cameras start LQ/None and get promoted on
        // their first tick after the grace period if they're not small.
        if (
          state.currentQuality === 'low' &&
          state.lqReason === LqReason.None
        ) {
          this.setQuality(state, 'high', LqReason.None, now);
          this.host.applyDirective(key, 'high');
          continue;
        }

        // SmallItem hysteresis: a tile demoted for *being small* must grow past
        // the hysteresis threshold (not merely back over the small threshold)
        // before returning to HQ. This dead-band prevents flapping around
        // smallItemHeightPx.
        if (
          state.currentQuality === 'low' &&
          state.lqReason === LqReason.SmallItem &&
          info.elementHeight > this.config.hysteresisHeightPx &&
          this.canSwitch(state, now)
        ) {
          this.setQuality(state, 'high', LqReason.None, now);
          this.host.applyDirective(key, 'high');
          continue;
        }

        // Constraint-based recovery (CapExceeded / TooManyItems / InheritedLq):
        // these tiles were demoted for a *global* reason, not for their own
        // size, so they recover as soon as the constraint clears — gated on the
        // tile not being small (> smallItemHeightPx), NOT the size hysteresis.
        // Gating these behind hysteresisHeightPx stranded tiles in the 171-230
        // band in LQ even when the cap/count had room (CLOUD-18303).
        //
        // CapExceeded and InheritedLq are additionally gated on real cap
        // headroom (hasHqHeadroom): promote only when a HQ slot is genuinely
        // free. Without it, under a sustained-full cap the smallest constrained
        // band tile would promote here and Check 8 would re-demote it every
        // switchCooldownMs — a real HQ-upgrade start/abort churn. (Size-based
        // promotions above keep size priority and stay non-headroom-gated;
        // Check 8 remains their safety net. TooManyItems keeps only its count
        // gate — it recovers when the >16-camera limit clears even if that means
        // Check 8 then re-arbitrates a cap slot by size, preserving its contract.)

        // CapExceeded recovery: promote when the max-concurrent-HQ cap has room.
        if (
          state.currentQuality === 'low' &&
          state.lqReason === LqReason.CapExceeded &&
          info.elementHeight > this.config.smallItemHeightPx &&
          this.canSwitch(state, now) &&
          this.hasHqHeadroom(infoCache)
        ) {
          this.setQuality(state, 'high', LqReason.None, now);
          this.host.applyDirective(key, 'high');
          continue;
        }

        // TooManyItems recovery: promote when camera count drops back under the limit
        if (
          state.currentQuality === 'low' &&
          state.lqReason === LqReason.TooManyItems &&
          this.states.size < this.config.maxCamerasBeforeForceLq &&
          info.elementHeight > this.config.smallItemHeightPx &&
          this.canSwitch(state, now)
        ) {
          this.setQuality(state, 'high', LqReason.None, now);
          this.host.applyDirective(key, 'high');
          continue;
        }

        // InheritedLq recovery: promote when no other cameras have performance-class LQ
        // reasons and the HQ cap has room. Note: multiple InheritedLq cameras block
        // each other until all can recover simultaneously (s !== state excludes self).
        if (
          state.currentQuality === 'low' &&
          state.lqReason === LqReason.InheritedLq &&
          info.elementHeight > this.config.smallItemHeightPx &&
          this.canSwitch(state, now) &&
          this.hasHqHeadroom(infoCache)
        ) {
          const hasPerformanceClassLq = [...this.states.values()].some(
            (s) =>
              s !== state &&
              s.currentQuality === 'low' &&
              (s.lqReason === LqReason.Performance ||
                s.lqReason === LqReason.TooManyItems ||
                s.lqReason === LqReason.InheritedLq ||
                s.lqReason === LqReason.CapExceeded),
          );
          if (!hasPerformanceClassLq) {
            this.setQuality(state, 'high', LqReason.None, now);
            this.host.applyDirective(key, 'high');
            continue;
          }
        }
      }

      this.host.applyDirective(key, state.currentQuality);
    }

    // Pause freeze (CLOUD-18235): the global demotion/promotion passes below
    // (performance, swap, cap enforcement) are all adaptive — skip them while
    // paused so pausing never changes any tile's quality.
    if (!playing) return;

    // ── Check 3: Performance-based switching ────────────────────────────
    // Pass 1: Find ANY camera with bad MOS
    const hasBadMos = [...this.states.entries()].some(([k]) => {
      const info = infoCache.get(k) ?? null;
      return info && info.statsUpdateCount >= this.config.minStatsForPerformanceCheck && info.snapshot.mos < this.config.mosThreshold;
    });

    // Sustained-health dwell (CLOUD-18327 follow-up): hasBadMos is an
    // instantaneous reading, so gating Pass 2 on it alone is memoryless. A
    // performance demotion genuinely relieves load, so MOS genuinely recovers —
    // the controller then promotes, the load returns, Pass 1 demotes again and
    // latches anti-thrash for 10 minutes. Require a *sustained* recovery, not
    // the one caused by the demotion itself. Mirrors the smallSince dwell on
    // the size path.
    //
    // Accumulated per playing tick rather than measured as (now - startedAt):
    // this pass is below the pause return, so a wall-clock timestamp would let
    // time spent paused satisfy the dwell with zero health evidence — the
    // streams are DC-paused while paused, so no MOS is being observed at all.
    // Counting ticks means the dwell only ever advances on evidence.
    this.healthyMs = hasBadMos ? 0 : this.healthyMs + this.config.tickIntervalMs;

    this.accrueHqEvidence();

    if (hasBadMos && !switchedThisTick) {
      // Find the smallest HQ camera by area to demote
      let smallestHqKey: string | null = null;
      let smallestArea = Infinity;

      for (const [k, s] of this.states) {
        if (s.currentQuality !== 'high') continue;
        if (now - s.registeredAt < this.config.recentlyAddedDelayMs) continue;
        const info = infoCache.get(k) ?? null;
        if (!info || !info.canAutoUpgrade) continue;
        if (info.viewportAreaFraction > this.config.forceHighViewportFraction) continue;
        if (info.targetStream !== TargetStream.AUTO) continue;
        if (!this.canSwitch(s, now)) continue;

        if (info.elementArea < smallestArea) {
          smallestArea = info.elementArea;
          smallestHqKey = k;
        }
      }

      if (smallestHqKey) {
        // Anti-thrash: if any camera was recently promoted and we're now demoting,
        // mark the promoted camera (not the demoted one) as anti-thrashed
        for (const [, s] of this.states) {
          if (s.performancePromotionPending) {
            s.antiThrash = true;
            s.antiThrashAt = now;
            s.performancePromotionPending = false;
            // This promotion demonstrably failed: we promoted it, and the load
            // came back. Each failure doubles the healthy period required before
            // the next attempt, so a link that cannot carry HQ stops being
            // retried forever instead of cycling at the anti-thrash period.
            s.failedHqAttempts++;
          }
        }

        const targetState = this.states.get(smallestHqKey)!;
        this.setQuality(targetState, 'low', LqReason.Performance, now);
        this.host.applyDirective(smallestHqKey, 'low');
        switchedThisTick = true;
      }
    }

    // Pass 2: Promote performance-LQ cameras if conditions improve.
    // Gate on !hasBadMos: while ANY camera is still struggling the system is
    // considered loaded, so we must not re-promote — even a camera whose own MOS
    // currently looks healthy. Pass 1 demotes on the *global* bad-MOS signal
    // (smallest HQ, regardless of which camera is bad), so without this symmetric
    // gate a healthy-MOS camera would be demoted (Pass 1) then re-promoted (Pass 2)
    // then demoted again, tripping anti-thrash and locking it out of HQ for
    // antiThrashRetryMs (10 min). See CLOUD-18327.
    if (!switchedThisTick && !hasBadMos) {
      for (const [k, s] of this.states) {
        if (switchedThisTick) break;
        if (s.currentQuality !== 'low' || s.lqReason !== LqReason.Performance) continue;
        if (s.antiThrash) continue;
        // Health must have been *observed* for the required period, not merely
        // be healthy right now (see the dwell comment above). The requirement
        // escalates with this camera's failed HQ attempts.
        if (this.healthyMs < this.requiredHealthyMs(s)) continue;
        if (!this.canSwitch(s, now)) continue;
        if (now - s.registeredAt < this.config.recentlyAddedDelayMs) continue;

        const info = infoCache.get(k) ?? null;
        if (!info) continue;
        if (info.snapshot.mos < this.config.mosThreshold) continue;
        // Gated on smallItemHeightPx, NOT the size hysteresis: Performance is a
        // *global* demotion reason like CapExceeded / TooManyItems / InheritedLq
        // above, so it recovers as soon as the constraint clears, provided the
        // tile is not small. The hysteresis dead-band only means something for
        // size-driven demotions. Gating this at hysteresisHeightPx stranded
        // tiles in the 171-230 band (CLOUD-18303) — permanently, since swap no
        // longer promotes Performance-LQ tiles either.
        if (info.elementHeight <= this.config.smallItemHeightPx) continue;

        this.setQuality(s, 'high', LqReason.None, now);
        this.host.applyDirective(k, 'high');
        s.performancePromotionPending = true;
        switchedThisTick = true;
      }
    }

    // ── Check 4: Swap logic ─────────────────────────────────────────────
    // Note: swap intentionally ignores per-camera antiThrash. Swap is layout-driven
    // (large LQ replaces small HQ) and should not be blocked by performance oscillation.
    if (!switchedThisTick) {
      let largestLqKey: string | null = null;
      let largestLqArea = 0;
      let smallestHqKey: string | null = null;
      let smallestHqArea = Infinity;

      for (const [k, s] of this.states) {
        const info = infoCache.get(k) ?? null;
        if (!info || !info.canAutoUpgrade) continue;
        if (info.targetStream !== TargetStream.AUTO) continue;
        if (info.viewportAreaFraction > this.config.forceHighViewportFraction) continue;

        // Performance-LQ is excluded alongside Manual: swap is size-driven and
        // applies no MOS gate at all, so it would promote a camera the
        // performance pass just demoted, restore the load, and feed the
        // HQ→LQ→HQ→LQ oscillation that latches anti-thrash (CLOUD-18327).
        // Performance recovery is Pass 2's job, behind the sustained-health dwell.
        if (
          s.currentQuality === 'low' &&
          s.lqReason !== LqReason.Manual &&
          s.lqReason !== LqReason.Performance
        ) {
          if (info.elementArea > largestLqArea && this.canSwitch(s, now)) {
            largestLqArea = info.elementArea;
            largestLqKey = k;
          }
        }
        if (s.currentQuality === 'high') {
          if (info.elementArea < smallestHqArea && this.canSwitch(s, now)) {
            smallestHqArea = info.elementArea;
            smallestHqKey = k;
          }
        }
      }

      if (
        largestLqKey &&
        smallestHqKey &&
        largestLqArea >= smallestHqArea * this.config.swapSizeRatio
      ) {
        const largeState = this.states.get(largestLqKey)!;
        const smallState = this.states.get(smallestHqKey)!;
        const inheritedReason = largeState.lqReason;

        this.setQuality(largeState, 'high', LqReason.None, now);
        this.setQuality(smallState, 'low', inheritedReason, now);
        this.host.applyDirective(largestLqKey, 'high');
        this.host.applyDirective(smallestHqKey, 'low');
        switchedThisTick = true;
      }
    }

    // ── Check 8: Max concurrent cap enforcement ─────────────────────────
    const hqCameras: Array<{ key: string; area: number }> = [];
    for (const [k, s] of this.states) {
      if (s.currentQuality !== 'high') continue;
      const info = infoCache.get(k) ?? null;
      if (!info) continue;
      // Don't cap forced-high cameras
      if (info.targetStream === TargetStream.HIGH) continue;
      if (info.viewportAreaFraction > this.config.forceHighViewportFraction) continue;
      hqCameras.push({ key: k, area: info.elementArea });
    }

    if (hqCameras.length > this.config.maxConcurrentHighRes) {
      // Sort ascending by area — smallest first to be demoted
      hqCameras.sort((a, b) => a.area - b.area);
      const excessCount = hqCameras.length - this.config.maxConcurrentHighRes;
      for (let i = 0; i < excessCount; i++) {
        const { key } = hqCameras[i];
        const state = this.states.get(key)!;
        this.setQuality(state, 'low', LqReason.CapExceeded, now);
        this.host.applyDirective(key, 'low');
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private setQuality(
    state: CameraRadassState,
    quality: 'high' | 'low',
    reason: LqReason,
    now: number,
  ): void {
    if (state.currentQuality !== quality) {
      state.lastSwitchTime = now;
      state.hqMs = 0;
    }
    state.currentQuality = quality;
    state.lqReason = quality === 'high' ? LqReason.None : reason;
  }

  /**
   * Healthy time this camera must observe before it may be promoted again.
   *
   * With no failures yet the base dwell applies: nothing has gone wrong, and
   * anti-thrash is not engaged either, so performanceRecoveryDelayMs is the real
   * gate for an ordinary recovery after a one-off blip.
   *
   * From the first FAILED attempt the ladder is built on antiThrashRetryMs
   * rather than on the base dwell, because a failed attempt always engages
   * anti-thrash and promotion is then gated by max(antiThrashRetryMs, this).
   * Rungs below that floor cannot bind, so basing the doubling on the small base
   * dwell would produce several silent no-op rungs before escalation was even
   * observable. Starting at the floor makes the very first failure lengthen the
   * retry interval.
   */
  private requiredHealthyMs(state: CameraRadassState): number {
    if (state.failedHqAttempts === 0) {
      return this.config.performanceRecoveryDelayMs;
    }
    return Math.min(
      this.config.antiThrashRetryMs * 2 ** state.failedHqAttempts,
      this.config.maxPerformanceRecoveryDelayMs,
    );
  }

  /**
   * Accumulate observed HQ time and clear the backoff history of any camera that
   * has held HQ, uninterrupted, for successfulHqPeriodMs. That is the only
   * positive evidence the link can now carry HQ, so a one-off bad spell never
   * penalizes a camera forever.
   *
   * Counted per playing tick rather than as (now - enteredHqAt), for the same
   * reason as healthyMs: this runs below the pause return, so a wall-clock span
   * would let a paused HQ tile bank "success" it never demonstrated — the stream
   * is DC-paused, so no HQ is actually being sustained. Cooldowns like
   * lastSwitchTime may safely expire during a pause; this is evidence, so it may
   * not.
   */
  private accrueHqEvidence(): void {
    for (const [, s] of this.states) {
      if (s.currentQuality !== 'high') {
        s.hqMs = 0;
        continue;
      }
      s.hqMs += this.config.tickIntervalMs;
      if (s.hqMs >= this.config.successfulHqPeriodMs) {
        s.failedHqAttempts = 0;
      }
    }
  }

  private canSwitch(state: CameraRadassState, now: number): boolean {
    // lastSwitchTime === 0 means the camera has never been switched; always eligible
    if (state.lastSwitchTime === 0) return true;
    return now - state.lastSwitchTime >= this.config.switchCooldownMs;
  }

  /**
   * True if at least one cap-counted HQ slot is free. Counts current HQ cameras
   * using the same filter as Check 8 cap enforcement (excludes forced-HIGH and
   * viewport-forced cameras, which don't count against maxConcurrentHighRes).
   * Reads live `currentQuality`, so in-tick promotions are reflected. Used to
   * gate constraint-based recovery so it never promotes into a full cap only for
   * Check 8 to immediately re-demote (CLOUD-18303 churn).
   */
  private hasHqHeadroom(infoCache: Map<string, CameraInfo | null>): boolean {
    let count = 0;
    for (const [k, s] of this.states) {
      if (s.currentQuality !== 'high') continue;
      const info = infoCache.get(k) ?? null;
      if (!info) continue;
      if (info.targetStream === TargetStream.HIGH) continue;
      if (info.viewportAreaFraction > this.config.forceHighViewportFraction) continue;
      count++;
    }
    return count < this.config.maxConcurrentHighRes;
  }

  /**
   * Release the anti-thrash brake on every camera. Called on layout changes
   * (register / unregister / small-item demotion), matching desktop.
   *
   * Deliberately does NOT touch failedHqAttempts or hqMs: this runs on
   * every layout tweak, and zeroing the backoff here would let ordinary layout
   * churn restart the promote/demote cycle from the base delay indefinitely.
   * The backoff is cleared only by real evidence — a sustained successful HQ
   * period, an explicit user HIGH, or the camera going away.
   */
  private resetAntiThrash(): void {
    for (const [, state] of this.states) {
      state.antiThrash = false;
      state.antiThrashAt = 0;
      state.performancePromotionPending = false;
    }
  }
}
