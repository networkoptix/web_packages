// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

/** Reason a camera was switched to low quality. Determines recovery behavior. */
export enum LqReason {
  /** Currently HQ or initial state. */
  None = 'none',
  /** Video element height <= smallItemHeightPx threshold. */
  SmallItem = 'smallItem',
  /** MOS dropped below mosThreshold (connection performance). */
  Performance = 'performance',
  /** Camera count exceeded maxCamerasBeforeForceLq when this camera was added. */
  TooManyItems = 'tooManyItems',
  /** Added while other cameras had non-size LQ reasons (inherited degradation). */
  InheritedLq = 'inheritedLq',
  /** User explicitly set TargetStream.LOW. */
  Manual = 'manual',
  /** Camera demoted by maxConcurrentHighRes cap enforcement. */
  CapExceeded = 'capExceeded',
}

// NOTE: String enum values are an intentional deviation from the spec's
// implicit numeric enum. String values are better for debugging/logging
// and no downstream code depends on numeric comparison.

/** Per-camera state tracked by the RadassController. */
export interface CameraRadassState {
  connectionKey: string;
  currentQuality: 'high' | 'low';
  lqReason: LqReason;
  /** Timestamp of last quality switch (performance.now()). */
  lastSwitchTime: number;
  /** Timestamp when item first became "small" (null if not small). */
  smallSince: number | null;
  /** Timestamp when this camera was registered. */
  registeredAt: number;
  /** Per-camera anti-thrash flag. When true, this camera can't be promoted for performance. */
  antiThrash: boolean;
  /** Timestamp when anti-thrash was set for this camera. */
  antiThrashAt: number;
  /** True if this camera was recently promoted from performance LQ. */
  performancePromotionPending: boolean;
}

/** Configuration for the RadassController. All timing values in milliseconds. */
export interface RadassConfig {
  /** Main tick interval. Default: 500. */
  tickIntervalMs: number;
  /** Minimum gap between quality switches per camera. Default: 5000. */
  switchCooldownMs: number;
  /** Height threshold (px) below which item is "small" -> LQ. Default: 171. */
  smallItemHeightPx: number;
  /** Height threshold (px) above which a "small" item can return to HQ. Default: 230. */
  hysteresisHeightPx: number;
  /** Viewport area fraction above which item is forced HQ. Default: 0.50. */
  forceHighViewportFraction: number;
  /** Maximum concurrent high-res streams. Default: 6. */
  maxConcurrentHighRes: number;
  /** Camera count above which new cameras start LQ. Default: 16. */
  maxCamerasBeforeForceLq: number;
  /** MOS below this = performance problem. Default: 3.5. */
  mosThreshold: number;
  /** Area ratio for swap logic (large LQ / small HQ). Default: 2.0. */
  swapSizeRatio: number;
  /** Time before retrying after anti-thrash block. Default: 600_000 (10 min). */
  antiThrashRetryMs: number;
  /** Time item must be small before LQ switch. Default: 1000. */
  smallItemDelayMs: number;
  /** Grace period for newly-added cameras (skip size/perf checks). Default: 1000. */
  recentlyAddedDelayMs: number;
  /** Minimum stats updates (inclusive) before performance demotion is allowed.
   *  A camera needs >= this many updateStats() calls before Check 3 considers its MOS.
   *  Stats are polled every ~1s, so 10 = ~10s of stable data before MOS is trusted.
   *  Default: 10. */
  minStatsForPerformanceCheck: number;
}

/** Default RADASS config matching desktop client values. */
export const DEFAULT_RADASS_CONFIG: RadassConfig = {
  tickIntervalMs: 500,
  switchCooldownMs: 5_000,
  smallItemHeightPx: 171,
  hysteresisHeightPx: 230,
  forceHighViewportFraction: 0.50,
  maxConcurrentHighRes: 6,
  maxCamerasBeforeForceLq: 16,
  mosThreshold: 3.5,
  swapSizeRatio: 2.0,
  antiThrashRetryMs: 600_000,
  smallItemDelayMs: 1_000,
  recentlyAddedDelayMs: 1_000,
  minStatsForPerformanceCheck: 10,
};
