// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import {
  MonoTypeOperatorFunction,
  Observable,
  animationFrames,
  exhaustMap,
  filter,
  last,
  map,
  mergeMap,
  scan,
  share,
  shareReplay,
  switchMap,
  take,
  throttle,
  timer,
  windowTime,
} from 'rxjs';

// ─── Bootstrap max-FPS detection ────────────────────────────────────────────

let maxFps = 60;

/**
 * Sets the maximum expected FPS baseline. Call this once during application
 * bootstrap so the frame-rate tracker can normalise its score correctly.
 *
 * @param fps - The maximum FPS the display is expected to produce (default 60).
 */
export function setMaxFpsOnBootstrap(fps: number = 60): void {
  maxFps = fps;
}

// ─── Shared animation-frame source ─────────────────────────────────────────
//
// Key fix from v1: use `refCount: true` so the inner subscription is torn down
// when there are no more subscribers, preventing leaked RAF loops.

const animationFrames$ = animationFrames().pipe(
  shareReplay({ bufferSize: 0, refCount: true }),
);

// ─── FPS sampler ────────────────────────────────────────────────────────────

interface FramesPerSecondOptions {
  sampleSizeSeconds?: number;
  updateIntervalSeconds?: number;
}

const framesPerSecondFactory = ({
  sampleSizeSeconds = 3,
  updateIntervalSeconds = 1,
}: FramesPerSecondOptions = {}): Observable<number> =>
  animationFrames$.pipe(
    windowTime(sampleSizeSeconds * 1000, updateIntervalSeconds * 1000),
    mergeMap((frames$) => frames$.pipe(
      scan((count: number) => count + 1, 0),
      last(() => true, 0),
    )),
    map((count) => Math.round(count / sampleSizeSeconds)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

// ─── Public frame-rate tracker ──────────────────────────────────────────────

/** A point-in-time summary of the browser's rendering frame rate. */
export interface FrameRateSnapshot {
  /** Current average FPS over the sliding window. */
  fps: number;
  /** Highest FPS observed during this session (at least `maxFps` from bootstrap). */
  maxFps: number;
  /** Normalised performance score (0 = stalled, 100 = full frame rate). */
  score: number;
}

/** Internal accumulator that extends {@link FrameRateSnapshot} with history buffers. */
interface FrameRateAccumulator extends FrameRateSnapshot {
  previousScores: number[];
  previousFps: number[];
}

/**
 * Observable that emits periodic snapshots of the current frame rate,
 * the observed maximum FPS, and a normalised performance score (0-100).
 *
 * Only emits while the document is visible to avoid skewed measurements
 * during background tabs.
 */
export const frameRateTracker$: Observable<FrameRateSnapshot> =
  framesPerSecondFactory().pipe(
    filter(() => document.visibilityState === 'visible'),
    scan<number, FrameRateAccumulator>(
      (acc, currentFps) => {
        const previousFps = [...acc.previousFps, currentFps].slice(-10);
        const currentScore = Math.min(
          Math.round((currentFps / acc.maxFps) * 100),
          100,
        );
        const previousScores = [...acc.previousScores, currentScore].slice(-10);
        const maxFpsValue = Math.max(
          previousScores.length ? Math.max(acc.maxFps, currentFps) : currentFps,
          maxFps,
        );
        const score = !previousScores.length
          ? 100
          : Math.round(
              previousScores.reduce((a, c) => a + c, 0) /
                previousScores.length,
            );
        const fps = Math.round(
          previousFps.reduce((a, c) => a + c, 0) / previousFps.length,
        );

        return { fps, maxFps: maxFpsValue, score, previousScores, previousFps };
      },
      {
        fps: 0,
        maxFps: 0,
        score: 100,
        previousScores: [] as number[],
        previousFps: [] as number[],
      },
    ),
    share({ resetOnRefCountZero: true }),
  );

// ─── Throttle operator ─────────────────────────────────────────────────────

const throttleByFrameRateScheduler$ = frameRateTracker$.pipe(
  take(1),
  exhaustMap(({ fps }) => timer(1000 / fps)),
  switchMap(() => animationFrames$),
  shareReplay({ bufferSize: 1, refCount: true }),
);

/**
 * RxJS operator that throttles emissions to the browser's current frame rate.
 * Trailing values are emitted so the latest state is never lost.
 *
 * @example
 * ```ts
 * source$.pipe(throttleByFrameRate()).subscribe(render);
 * ```
 */
export function throttleByFrameRate<T>(): MonoTypeOperatorFunction<T> {
  return throttle<T>(() => throttleByFrameRateScheduler$, {
    leading: false,
    trailing: true,
  });
}
