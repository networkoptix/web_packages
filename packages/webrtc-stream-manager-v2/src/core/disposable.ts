// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

export abstract class Disposable {
  private readonly abortController = new AbortController();

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
    const id = globalThis.setTimeout(callback, delay);
    this.onDispose(() => clearTimeout(id));
    return id;
  }

  protected setInterval(callback: () => void, delay: number) {
    const id = globalThis.setInterval(callback, delay);
    this.onDispose(() => clearInterval(id));
    return id;
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
