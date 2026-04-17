// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { abortableSleep, linkSignal } from '../../src/utils/abort-helpers';

describe('abortableSleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves after the delay', async () => {
    const ac = new AbortController();
    const promise = abortableSleep(1000, ac.signal);

    vi.advanceTimersByTime(1000);

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects when signal is aborted before delay', async () => {
    const ac = new AbortController();
    const promise = abortableSleep(1000, ac.signal);

    ac.abort();

    await expect(promise).rejects.toThrow('aborted');
    await expect(promise).rejects.toBeInstanceOf(DOMException);
  });

  it('rejects immediately if signal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();

    const promise = abortableSleep(1000, ac.signal);

    await expect(promise).rejects.toThrow('aborted');
    await expect(promise).rejects.toBeInstanceOf(DOMException);
  });
});

describe('linkSignal', () => {
  it('aborts child when parent aborts', () => {
    const parent = new AbortController();
    const child = new AbortController();

    linkSignal(parent.signal, child);
    parent.abort();

    expect(child.signal.aborted).toBe(true);
  });

  it('does not abort parent when child aborts', () => {
    const parent = new AbortController();
    const child = new AbortController();

    linkSignal(parent.signal, child);
    child.abort();

    expect(parent.signal.aborted).toBe(false);
  });

  it('cleans up listener when child aborts independently (no double-abort crash)', () => {
    const parent = new AbortController();
    const child = new AbortController();

    linkSignal(parent.signal, child);

    // Abort child first — the listener on parent should be removed
    child.abort();

    // Now abort parent — should not throw or double-abort the already-aborted child
    expect(() => parent.abort()).not.toThrow();
  });
});
