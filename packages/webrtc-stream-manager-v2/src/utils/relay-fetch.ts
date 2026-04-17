// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { abortableSleep } from './abort-helpers';

/** Sentinel signal that is never aborted — used as a default when no signal is provided. */
const NEVER_ABORT = new AbortController().signal;

/**
 * Fetch wrapper that re-attaches the Authorization header after cross-origin
 * redirects (browsers strip it per spec) and retries on transient 401s.
 *
 * 503 handling is intentionally omitted here — it belongs in
 * {@link StreamManager.fetchOneTimeTicket} where it can invalidate the relay
 * host cache and retry with the template URL.
 *
 * @param input - The URL to fetch.
 * @param init - Standard fetch RequestInit options.
 * @param retries - Maximum number of retries (default 10).
 * @param signal - Optional AbortSignal to cancel the fetch and retries.
 */
export async function fetchWithRedirectAuthorization(
  input: string,
  init: RequestInit,
  retries = 10,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetch(input, { ...init, signal });
  const unauthorized = response.status === 401;

  // Redirected + 401: browser stripped auth on cross-origin redirect.
  // Retry at final URL with original auth headers.
  if (response.redirected && unauthorized) {
    return retries
      ? fetchWithRedirectAuthorization(response.url, init, retries - 1, signal)
      : fetch(response.url, { ...init, signal });
  }

  // Non-redirected 401: retry with small delay (token refresh race).
  if (unauthorized && retries > 0) {
    if (signal?.aborted) {
      throw new DOMException('aborted', 'AbortError');
    }
    const delay = 100 * (11 - retries);
    await abortableSleep(delay, signal ?? NEVER_ABORT);
    return fetchWithRedirectAuthorization(input, init, retries - 1, signal);
  }

  return response;
}
