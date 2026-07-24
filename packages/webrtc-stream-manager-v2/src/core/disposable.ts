// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

export abstract class Disposable {
  private readonly abortController = new AbortController();
  private pendingTimers: Set<ReturnType<typeof globalThis.setTimeout>> | null = null;

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  get disposed(): boolean {
    return this.signal.aborted;
  }

  /** Throws if this instance has already been disposed. */
  protected throwIfDisposed(): void {
    if (this.disposed) throw new Error(`${this.constructor.name} has been disposed`);
  }

  protected linkTo(parentSignal: AbortSignal): void {
    parentSignal.addEventListener('abort', () => this.dispose(), { signal: this.signal });
  }

  protected onDispose(cleanup: () => void): void {
    // Do NOT pass { signal: this.signal } here. Per the DOM spec, the abort
    // algorithm (which removes listeners registered with a signal option) runs
    // BEFORE the abort event is dispatched.  Since we are listening on the same
    // signal that would trigger removal, the listener would be stripped before
    // it ever fires.  Omitting the option is safe: once the signal aborts the
    // Disposable is done, and all references will be GC'd together.
    this.signal.addEventListener('abort', cleanup);
  }

  protected setTimeout(callback: () => void, delay: number) {
    const id = globalThis.setTimeout(() => {
      this.pendingTimers?.delete(id);
      callback();
    }, delay);
    this.trackTimer(id);
    return id;
  }

  /** Counterpart to {@link setTimeout}; keeps the pending-timer set from growing under re-arm patterns. */
  protected clearTimeout(id: ReturnType<typeof globalThis.setTimeout>): void {
    this.pendingTimers?.delete(id);
    globalThis.clearTimeout(id);
  }

  protected setInterval(callback: () => void, delay: number) {
    const id = globalThis.setInterval(callback, delay);
    this.trackTimer(id);
    return id;
  }

  protected clearInterval(id: ReturnType<typeof globalThis.setInterval>): void {
    this.pendingTimers?.delete(id);
    globalThis.clearInterval(id);
  }

  private trackTimer(id: ReturnType<typeof globalThis.setTimeout>): void {
    if (!this.pendingTimers) {
      this.pendingTimers = new Set();
      // Single sweep — a listener per set* call accumulates unboundedly under
      // re-arm patterns. clearTimeout clears intervals too (shared handle pool).
      this.onDispose(() => this.pendingTimers?.forEach((t) => globalThis.clearTimeout(t)));
    }
    this.pendingTimers.add(id);
  }

  /** Hook that runs after the abort signal fires during {@link dispose}. Override in subclasses for synchronous post-abort cleanup. */
  protected onAfterAbort(): void {}

  dispose(): void {
    if (this.disposed) return;
    // Abort synchronously so `disposed` is true immediately,
    // preventing re-entrant dispose calls.
    this.abortController.abort();
    this.onAfterAbort();
  }

  [Symbol.asyncDispose](): void {
    this.dispose();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}
