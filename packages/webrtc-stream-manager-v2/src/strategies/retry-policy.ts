// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { abortableSleep } from '../utils/abort-helpers';
import { ConnectionError } from '../types';

// ─── Config ─────────────────────────────────────────────────────────────────

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  classifyFn?: (error: ConnectionError | string) => 'retryable' | 'non-retryable';
}

// ─── Error classification ───────────────────────────────────────────────────

const NON_RETRYABLE: ReadonlySet<string> = new Set<string>([
  ConnectionError.authorization,
  ConnectionError.transcodingDisabled,
  ConnectionError.mjpegDisabled,
  ConnectionError.proxyDisabled,
  ConnectionError.invalidAccessToken,
]);

/**
 * Classify a connection error as retryable or non-retryable.
 *
 * Non-retryable errors are terminal conditions that will not resolve by
 * retrying (e.g. authorization failures or disabled features).
 */
export function classifyError(
  error: ConnectionError | string,
): 'retryable' | 'non-retryable' {
  return NON_RETRYABLE.has(error) ? 'non-retryable' : 'retryable';
}

/** Convenience boolean wrapper around {@link classifyError}. */
export function isRetryableError(error: ConnectionError | string): boolean {
  return classifyError(error) === 'retryable';
}

// ─── Retry utility ──────────────────────────────────────────────────────────

/**
 * Execute `fn` with automatic retries using exponential back-off.
 *
 * - Respects the provided `AbortSignal`; aborts immediately if signalled.
 * - Non-retryable errors (per `config.classifyFn` or the default
 *   {@link classifyError}) are thrown without retrying.
 * - Back-off: `baseDelayMs * 2^attempt`, capped at `maxDelayMs`, with 50 %
 *   jitter (actual delay is between 50 % and 100 % of the computed value).
 * - Delays use {@link abortableSleep} so they are cancellable via the signal.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  parentSignal: AbortSignal,
): Promise<T> {
  const {
    maxAttempts,
    baseDelayMs,
    maxDelayMs,
    classifyFn = classifyError,
  } = config;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (parentSignal.aborted) {
      throw new DOMException('aborted', 'AbortError');
    }

    try {
      return await fn();
    } catch (error) {
      // Propagate abort immediately.
      if (parentSignal.aborted) {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      // Non-retryable errors are terminal.
      if (classifyFn(error as ConnectionError | string) === 'non-retryable') {
        throw error;
      }

      // Last attempt — nothing left to retry.
      if (attempt === maxAttempts - 1) {
        throw error;
      }

      // Exponential back-off with 50 % jitter.
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jittered = delay * (0.5 + Math.random() * 0.5);
      await abortableSleep(jittered, parentSignal);
    }
  }

  // Unreachable — the loop always returns or throws on every iteration.
  throw new Error('withRetry: unreachable');
}
