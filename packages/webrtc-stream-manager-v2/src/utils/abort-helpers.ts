// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

/**
 * Returns a promise that resolves after `ms` milliseconds, or rejects with
 * an `AbortError` if `signal` is aborted before the timer fires.
 *
 * @param ms - Delay in milliseconds.
 * @param signal - AbortSignal used to cancel the sleep early.
 * @returns A promise that resolves after the delay or rejects on abort.
 */
export function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Propagate abort from a parent signal to a child AbortController.
 * The listener is auto-removed when the child is aborted, preventing leaks.
 *
 * @param parentSignal - Signal to listen on.
 * @param child - Controller whose `.abort()` is called when the parent fires.
 */
export function linkSignal(parentSignal: AbortSignal, child: AbortController): void {
  const onParentAbort = () => child.abort();
  parentSignal.addEventListener('abort', onParentAbort, { signal: child.signal });
}
