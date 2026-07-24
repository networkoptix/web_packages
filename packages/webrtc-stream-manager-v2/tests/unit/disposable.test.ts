// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Disposable } from '../../src/core/disposable';

/** Concrete subclass for testing the abstract Disposable. */
class TestDisposable extends Disposable {
  public afterAbortCallCount = 0;

  /** Expose protected linkTo for testing. */
  public exposedLinkTo(parentSignal: AbortSignal): void {
    this.linkTo(parentSignal);
  }

  /** Expose protected onDispose for testing. */
  public exposedOnDispose(cleanup: () => void): void {
    this.onDispose(cleanup);
  }

  /** Expose protected setTimeout for testing. */
  public exposedSetTimeout(callback: () => void, delay: number) {
    return this.setTimeout(callback, delay);
  }

  /** Expose protected setInterval for testing. */
  public exposedSetInterval(callback: () => void, delay: number) {
    return this.setInterval(callback, delay);
  }

  /** Expose protected clearTimeout for testing. */
  public exposedClearTimeout(id: ReturnType<typeof globalThis.setTimeout>) {
    this.clearTimeout(id);
  }

  protected override onAfterAbort(): void {
    this.afterAbortCallCount++;
  }
}

describe('Disposable', () => {
  it('starts not disposed', () => {
    const instance = new TestDisposable();
    expect(instance.disposed).toBe(false);
  });

  it('becomes disposed after dispose()', async () => {
    const instance = new TestDisposable();
    await instance.dispose();
    expect(instance.disposed).toBe(true);
  });

  it('double dispose is safe (no-op, no throw)', async () => {
    const instance = new TestDisposable();
    await instance.dispose();
    await instance.dispose();
    expect(instance.disposed).toBe(true);
    // onAfterAbort should only have been called once
    expect(instance.afterAbortCallCount).toBe(1);
  });

  it('runs onDispose callbacks on dispose', async () => {
    const instance = new TestDisposable();
    const callback = vi.fn();
    instance.exposedOnDispose(callback);

    expect(callback).not.toHaveBeenCalled();
    await instance.dispose();
    expect(callback).toHaveBeenCalledOnce();
  });

  it('runs onAfterAbort after the abort signal fires', async () => {
    const order: string[] = [];

    class OrderTrackingDisposable extends Disposable {
      constructor() {
        super();
        this.onDispose(() => order.push('abort-listener'));
      }

      protected override onAfterAbort(): void {
        order.push('after-abort');
      }
    }

    const instance = new OrderTrackingDisposable();
    await instance.dispose();

    // abort() fires synchronously (setting disposed=true immediately to
    // prevent re-entry), then onAfterAbort runs synchronously after.
    expect(order).toEqual(['abort-listener', 'after-abort']);
  });

  it('cascades disposal from parent to child via linkTo', async () => {
    const parent = new TestDisposable();
    const child = new TestDisposable();
    child.exposedLinkTo(parent.signal);

    expect(child.disposed).toBe(false);
    await parent.dispose();
    expect(child.disposed).toBe(true);
  });

  describe('managed timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('clears managed setTimeout on dispose', async () => {
      const instance = new TestDisposable();
      const callback = vi.fn();
      instance.exposedSetTimeout(callback, 1000);

      await instance.dispose();
      vi.advanceTimersByTime(2000);

      expect(callback).not.toHaveBeenCalled();
    });

    it('clears managed setInterval on dispose', async () => {
      const instance = new TestDisposable();
      const callback = vi.fn();
      instance.exposedSetInterval(callback, 500);

      // Let one tick fire before dispose
      vi.advanceTimersByTime(500);
      expect(callback).toHaveBeenCalledTimes(1);

      await instance.dispose();
      vi.advanceTimersByTime(2000);

      // Should still be 1 -- no further calls after dispose
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('clearTimeout cancels a managed timer', () => {
      const instance = new TestDisposable();
      const callback = vi.fn();
      const id = instance.exposedSetTimeout(callback, 1000);

      instance.exposedClearTimeout(id);
      vi.advanceTimersByTime(2000);

      expect(callback).not.toHaveBeenCalled();
    });

    it('re-arming a timer many times keeps a single abort listener', async () => {
      const instance = new TestDisposable();
      const addListener = vi.spyOn(instance.signal, 'addEventListener');

      let id = instance.exposedSetTimeout(() => {}, 1000);
      for (let i = 0; i < 100; i++) {
        instance.exposedClearTimeout(id);
        id = instance.exposedSetTimeout(() => {}, 1000);
      }

      expect(addListener).toHaveBeenCalledTimes(1);

      // The surviving timer is still swept on dispose.
      const callback = vi.fn();
      instance.exposedClearTimeout(id);
      instance.exposedSetTimeout(callback, 1000);
      await instance.dispose();
      vi.advanceTimersByTime(2000);
      expect(callback).not.toHaveBeenCalled();
    });

    it('a fired timer runs its callback and later timers are still swept', async () => {
      const instance = new TestDisposable();
      const fired = vi.fn();
      instance.exposedSetTimeout(fired, 100);
      vi.advanceTimersByTime(100);
      expect(fired).toHaveBeenCalledOnce();

      const pending = vi.fn();
      instance.exposedSetTimeout(pending, 1000);
      await instance.dispose();
      vi.advanceTimersByTime(2000);
      expect(pending).not.toHaveBeenCalled();
    });
  });

  it('exposes signal as public getter', () => {
    const instance = new TestDisposable();
    expect(instance.signal).toBeInstanceOf(AbortSignal);
    expect(instance.signal.aborted).toBe(false);
  });
});
