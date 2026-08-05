// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Subject } from 'rxjs';

// ─── CLOUD-16679 throttleByFrameRate leak regression ─────────────────────────
//
// `throttleByFrameRate()` throttles a source to the browser frame rate using a
// module-level scheduler observable. The bug: the scheduler terminated in
// `shareReplay({ bufferSize: 1 })`, whose ReplaySubject connector replays its
// buffered animation-frame value *synchronously* when a new subscriber
// subscribes. Inside rxjs `throttle.startThrottle`, that replay fires the
// duration's `endThrottling` before the `throttled = ...subscribe(...)`
// assignment completes, so the just-created duration subscription is never
// unsubscribed and stays registered on the connector's ReplaySubject forever.
// Over time the connector's `.observers` array grows without bound (the
// dominant instance-count leak). The fix replaces the terminal `shareReplay`
// with `share()` (bufferSize 0 = no synchronous replay).
//
// These tests drive the REAL exported `throttleByFrameRate()` against a
// deterministic animation-frame clock (fake timers + a setTimeout-backed
// requestAnimationFrame shim, so RAF, windowTime and timer all advance on one
// clock).

function maxObservers(tracked: Set<{ observers?: unknown[] | null }>): number {
  let max = 0;
  for (const subject of tracked) {
    const n = subject.observers?.length ?? 0;
    if (n > max) max = n;
  }
  return max;
}

describe('throttleByFrameRate (CLOUD-16679 scheduler leak)', () => {
  let originalRAF: typeof globalThis.requestAnimationFrame;
  let originalCAF: typeof globalThis.cancelAnimationFrame;
  let originalVisibility: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();

    let rafId = 0;
    const pending = new Map<number, ReturnType<typeof setTimeout>>();
    originalRAF = globalThis.requestAnimationFrame;
    originalCAF = globalThis.cancelAnimationFrame;
    // Back requestAnimationFrame with the (faked) setTimeout so a single time
    // axis drives frames, windowTime windows and timer() together.
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback): number => {
      const handle = ++rafId;
      const timer = setTimeout(() => {
        pending.delete(handle);
        cb(Date.now());
      }, 16);
      pending.set(handle, timer);
      return handle;
    }) as typeof globalThis.requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((handle: number): void => {
      const timer = pending.get(handle);
      if (timer !== undefined) {
        clearTimeout(timer);
        pending.delete(handle);
      }
    }) as typeof globalThis.cancelAnimationFrame;

    originalVisibility = Object.getOwnPropertyDescriptor(
      document,
      'visibilityState',
    );
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
    if (originalVisibility) {
      Object.defineProperty(document, 'visibilityState', originalVisibility);
    }
    vi.restoreAllMocks();
  });

  it('keeps the scheduler connector observer count bounded across many throttled windows', async () => {
    // Track every rxjs Subject/ReplaySubject connector that gets subscribed, so
    // we can watch the scheduler connector's `.observers` array. All connectors
    // share `Subject.prototype._innerSubscribe`, including the ReplaySubject
    // that `shareReplay` creates.
    const proto = Subject.prototype as unknown as {
      _innerSubscribe: (subscriber: unknown) => unknown;
    };
    const tracked = new Set<{ observers?: unknown[] | null }>();
    const originalInnerSubscribe = proto._innerSubscribe;
    proto._innerSubscribe = function (
      this: { observers?: unknown[] | null },
      subscriber: unknown,
    ) {
      tracked.add(this);
      return originalInnerSubscribe.call(this, subscriber);
    };

    try {
      const { throttleByFrameRate } = await import('../../src/utils');
      const source$ = new Subject<number>();
      const outputs: number[] = [];
      const subscription = source$
        .pipe(throttleByFrameRate<number>())
        .subscribe((value) => outputs.push(value));

      // Kick off the scheduler subscription (throttle only subscribes to the
      // duration on the first source value), then bootstrap the frame-rate
      // pipeline (windowTime(3s,1s) -> timer(1000/fps) -> animationFrames$).
      source$.next(-1);
      vi.advanceTimersByTime(5000);
      const maxAfterBootstrap = maxObservers(tracked);

      // Drive 60 throttled windows: one source value + one animation frame each.
      const windows = 60;
      for (let i = 0; i < windows; i++) {
        source$.next(i);
        vi.advanceTimersByTime(20);
      }
      const maxAfterDriving = maxObservers(tracked);

      subscription.unsubscribe();
      source$.complete();

      // Bootstrap should leave only a couple of live observers on any connector.
      expect(maxAfterBootstrap).toBeLessThan(5);
      // With the shareReplay bug the connector's observers grow ~1 per window
      // (≈ `windows`). With the `share()` fix it stays bounded.
      expect(maxAfterDriving).toBeLessThan(10);
    } finally {
      proto._innerSubscribe = originalInnerSubscribe;
    }
  });

  it('does not deliver a throttled value synchronously while the frame-rate scheduler is warm', async () => {
    const { throttleByFrameRate } = await import('../../src/utils');

    // Warm the scheduler: bootstrap so its connector has buffered a frame.
    const warm$ = new Subject<number>();
    const warmSubscription = warm$
      .pipe(throttleByFrameRate<number>())
      .subscribe();
    warm$.next(-1);
    vi.advanceTimersByTime(5000);

    // A brand-new subscriber must wait for the NEXT real animation frame before
    // emitting. With the shareReplay bug the warm connector replays its buffered
    // frame synchronously on subscribe, so the trailing value is delivered
    // immediately (and a duration subscription is orphaned).
    const probe$ = new Subject<number>();
    const probeOutputs: number[] = [];
    const probeSubscription = probe$
      .pipe(throttleByFrameRate<number>())
      .subscribe((value) => probeOutputs.push(value));
    probe$.next(42);

    expect(probeOutputs).toEqual([]);

    // After a real frame it emits the trailing value (still functional).
    vi.advanceTimersByTime(20);
    expect(probeOutputs).toEqual([42]);

    warmSubscription.unsubscribe();
    probeSubscription.unsubscribe();
    warm$.complete();
    probe$.complete();
  });

  it('throttles emissions to the frame cadence (trailing value preserved, not passed through)', async () => {
    const { throttleByFrameRate } = await import('../../src/utils');

    const source$ = new Subject<number>();
    const outputs: number[] = [];
    const subscription = source$
      .pipe(throttleByFrameRate<number>())
      .subscribe((value) => outputs.push(value));

    // Bootstrap.
    source$.next(0);
    vi.advanceTimersByTime(5000);
    outputs.length = 0;

    // Emit a rapid burst of values within a single frame gap: leading:false
    // means nothing is emitted until the window closes on the next frame, and
    // only the trailing (latest) value survives.
    source$.next(1);
    source$.next(2);
    source$.next(3);
    expect(outputs).toEqual([]);

    vi.advanceTimersByTime(20); // one frame closes the window
    expect(outputs).toEqual([3]);

    // Another burst collapses to its trailing value on the next frame.
    source$.next(4);
    source$.next(5);
    vi.advanceTimersByTime(20);
    expect(outputs).toEqual([3, 5]);

    subscription.unsubscribe();
    source$.complete();
  });
});
