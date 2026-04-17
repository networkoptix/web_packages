// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  classifyError,
  isRetryableError,
  withRetry,
  type RetryConfig,
} from '../../src/strategies/retry-policy';
import { ConnectionError } from '../../src/types';

// ─── classifyError ──────────────────────────────────────────────────────────

describe('classifyError', () => {
  it('classifies websocket as retryable', () => {
    expect(classifyError(ConnectionError.websocket)).toBe('retryable');
  });

  it('classifies lostConnection as retryable', () => {
    expect(classifyError(ConnectionError.lostConnection)).toBe('retryable');
  });

  it('classifies authorization as non-retryable', () => {
    expect(classifyError(ConnectionError.authorization)).toBe('non-retryable');
  });

  it('classifies transcodingDisabled as non-retryable', () => {
    expect(classifyError(ConnectionError.transcodingDisabled)).toBe(
      'non-retryable',
    );
  });

  it('classifies unknown string as retryable', () => {
    expect(classifyError('someUnknownError')).toBe('retryable');
  });
});

// ─── isRetryableError ───────────────────────────────────────────────────────

describe('isRetryableError', () => {
  it('returns true for retryable errors', () => {
    expect(isRetryableError(ConnectionError.websocket)).toBe(true);
    expect(isRetryableError(ConnectionError.lostConnection)).toBe(true);
  });

  it('returns false for non-retryable errors', () => {
    expect(isRetryableError(ConnectionError.authorization)).toBe(false);
    expect(isRetryableError(ConnectionError.transcodingDisabled)).toBe(false);
    expect(isRetryableError(ConnectionError.mjpegDisabled)).toBe(false);
    expect(isRetryableError(ConnectionError.proxyDisabled)).toBe(false);
    expect(isRetryableError(ConnectionError.invalidAccessToken)).toBe(false);
  });
});

// ─── withRetry ──────────────────────────────────────────────────────────────

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 5000,
  };

  it('returns on first success', async () => {
    const fn = vi.fn().mockResolvedValueOnce('ok');
    const ac = new AbortController();

    const result = await withRetry(fn, defaultConfig, ac.signal);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(ConnectionError.websocket)
      .mockResolvedValueOnce('recovered');
    const ac = new AbortController();

    const promise = withRetry(fn, defaultConfig, ac.signal);

    // Advance past all backoff delays so the retry completes
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max attempts are exhausted', async () => {
    const fn = vi.fn().mockRejectedValue(ConnectionError.websocket);
    const ac = new AbortController();

    const promise = withRetry(fn, defaultConfig, ac.signal);

    // Eagerly mark rejection as handled so Node does not flag it as
    // unhandled while runAllTimersAsync drains the backoff delays.
    promise.catch(() => {});

    // Run all timers to exhaust every retry attempt
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toBe(ConnectionError.websocket);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws immediately for non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(ConnectionError.authorization);
    const ac = new AbortController();

    await expect(
      withRetry(fn, defaultConfig, ac.signal),
    ).rejects.toBe(ConnectionError.authorization);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('aborts when signal is aborted during backoff', async () => {
    const fn = vi.fn().mockRejectedValue(ConnectionError.websocket);
    const ac = new AbortController();

    const promise = withRetry(
      fn,
      { maxAttempts: 5, baseDelayMs: 10_000, maxDelayMs: 60_000 },
      ac.signal,
    );

    // Flush microtasks so the first fn() call rejects and abortableSleep is entered
    await vi.advanceTimersByTimeAsync(0);

    // Abort while sleeping
    ac.abort();

    await expect(promise).rejects.toThrow('aborted');
  });
});
