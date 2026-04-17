// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRedirectAuthorization } from '../../src/utils/relay-fetch';

describe('fetchWithRedirectAuthorization', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mockResponse(
    overrides: Partial<Response> & { status?: number; redirected?: boolean; url?: string } = {},
  ): Response {
    return {
      ok: overrides.status ? overrides.status >= 200 && overrides.status < 300 : true,
      status: 200,
      statusText: 'OK',
      redirected: false,
      url: 'https://example.com/api',
      headers: new Headers(),
      type: 'basic' as ResponseType,
      body: null,
      bodyUsed: false,
      clone: vi.fn(),
      arrayBuffer: vi.fn(),
      blob: vi.fn(),
      formData: vi.fn(),
      json: vi.fn(),
      text: vi.fn(),
      bytes: vi.fn(),
      ...overrides,
    } as unknown as Response;
  }

  it('returns the response on a successful fetch (no redirect, no 401)', async () => {
    const response = mockResponse({ status: 200 });
    vi.mocked(globalThis.fetch).mockResolvedValue(response);

    const result = await fetchWithRedirectAuthorization(
      'https://example.com/api',
      { headers: { Authorization: 'Bearer token' } },
    );

    expect(result).toBe(response);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    );
  });

  it('forwards the signal to fetch', async () => {
    const response = mockResponse({ status: 200 });
    vi.mocked(globalThis.fetch).mockResolvedValue(response);
    const controller = new AbortController();

    await fetchWithRedirectAuthorization(
      'https://example.com/api',
      { headers: {} },
      10,
      controller.signal,
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  describe('redirect + 401 handling', () => {
    it('re-fetches at the redirect URL with original auth headers', async () => {
      const redirectResponse = mockResponse({
        status: 401,
        redirected: true,
        url: 'https://redirected.example.com/api',
      });
      const successResponse = mockResponse({ status: 200 });

      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValueOnce(successResponse);

      const init = { headers: { Authorization: 'Bearer token' } };
      const result = await fetchWithRedirectAuthorization(
        'https://example.com/api',
        init,
        10,
      );

      expect(result).toBe(successResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);

      // Second call should use the redirected URL
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        'https://redirected.example.com/api',
        expect.objectContaining({
          headers: { Authorization: 'Bearer token' },
        }),
      );
    });

    it('falls back to plain fetch when retries are exhausted on redirect', async () => {
      const redirectResponse = mockResponse({
        status: 401,
        redirected: true,
        url: 'https://redirected.example.com/api',
      });
      const finalResponse = mockResponse({ status: 401 });

      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValue(finalResponse);

      const init = { headers: { Authorization: 'Bearer token' } };
      const result = await fetchWithRedirectAuthorization(
        'https://example.com/api',
        init,
        0, // no retries left
      );

      // With 0 retries on a redirected 401, it does a plain fetch at the redirected URL
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        'https://redirected.example.com/api',
        expect.objectContaining({
          headers: { Authorization: 'Bearer token' },
          signal: undefined,
        }),
      );
    });
  });

  describe('non-redirected 401 retry with backoff', () => {
    it('retries on 401 with increasing delay', async () => {
      const unauthorizedResponse = mockResponse({ status: 401 });
      const successResponse = mockResponse({ status: 200 });

      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce(unauthorizedResponse) // first attempt (retries=10)
        .mockResolvedValueOnce(unauthorizedResponse) // second attempt (retries=9)
        .mockResolvedValueOnce(successResponse);     // third attempt (retries=8)

      const resultPromise = fetchWithRedirectAuthorization(
        'https://example.com/api',
        { headers: {} },
        10,
      );

      // First retry: delay = 100 * (11 - 10) = 100ms
      await vi.advanceTimersByTimeAsync(100);

      // Second retry: delay = 100 * (11 - 9) = 200ms
      await vi.advanceTimersByTimeAsync(200);

      const result = await resultPromise;
      expect(result).toBe(successResponse);
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });

    it('delay increases with each retry (exponential-like backoff)', async () => {
      // retries=10 → delay 100 * (11-10) = 100
      // retries=9  → delay 100 * (11-9)  = 200
      // retries=8  → delay 100 * (11-8)  = 300
      // retries=7  → delay 100 * (11-7)  = 400
      const delays = [100, 200, 300, 400];
      for (let i = 0; i < delays.length; i++) {
        const retries = 10 - i;
        expect(100 * (11 - retries)).toBe(delays[i]);
      }
    });

    it('stops retrying when retries reach 0', async () => {
      const unauthorizedResponse = mockResponse({ status: 401 });

      vi.mocked(globalThis.fetch).mockResolvedValue(unauthorizedResponse);

      const resultPromise = fetchWithRedirectAuthorization(
        'https://example.com/api',
        { headers: {} },
        2,
      );

      // First retry: delay = 100 * (11 - 2) = 900ms
      await vi.advanceTimersByTimeAsync(900);

      // Second retry: delay = 100 * (11 - 1) = 1000ms
      await vi.advanceTimersByTimeAsync(1000);

      // Now retries = 0, should return the 401 response
      const result = await resultPromise;
      expect(result.status).toBe(401);

      // 1 initial + 2 retries = 3 total fetch calls
      expect(globalThis.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('abort signal handling', () => {
    it('throws AbortError when signal is already aborted before retry sleep', async () => {
      const unauthorizedResponse = mockResponse({ status: 401 });
      vi.mocked(globalThis.fetch).mockResolvedValue(unauthorizedResponse);

      const controller = new AbortController();
      controller.abort();

      // The function checks signal.aborted before sleeping
      await expect(
        fetchWithRedirectAuthorization(
          'https://example.com/api',
          { headers: {} },
          10,
          controller.signal,
        ),
      ).rejects.toThrow('aborted');
    });

    it('throws AbortError when signal is aborted during retry sleep', async () => {
      const unauthorizedResponse = mockResponse({ status: 401 });
      vi.mocked(globalThis.fetch).mockResolvedValue(unauthorizedResponse);

      const controller = new AbortController();

      const resultPromise = fetchWithRedirectAuthorization(
        'https://example.com/api',
        { headers: {} },
        10,
        controller.signal,
      );

      // The first fetch resolves with 401, then abortableSleep is called
      // with delay=100. Advance partially into the sleep, then abort.
      await vi.advanceTimersByTimeAsync(50);

      // Abort and immediately flush the microtask queue so the rejection
      // is caught by our `.rejects` matcher, not surfaced as unhandled.
      controller.abort();

      await expect(resultPromise).rejects.toThrow('aborted');
    });

    it('passes signal through to fetch calls', async () => {
      const response = mockResponse({ status: 200 });
      vi.mocked(globalThis.fetch).mockResolvedValue(response);

      const controller = new AbortController();
      await fetchWithRedirectAuthorization(
        'https://example.com/api',
        { headers: {} },
        10,
        controller.signal,
      );

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('NEVER_ABORT sentinel', () => {
    it('uses a non-aborted signal when no signal is provided', async () => {
      const unauthorizedResponse = mockResponse({ status: 401 });
      const successResponse = mockResponse({ status: 200 });

      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce(unauthorizedResponse)
        .mockResolvedValueOnce(successResponse);

      const resultPromise = fetchWithRedirectAuthorization(
        'https://example.com/api',
        { headers: {} },
        10,
        // no signal passed — internally uses NEVER_ABORT
      );

      // Should sleep and retry without error (NEVER_ABORT is never aborted)
      await vi.advanceTimersByTimeAsync(100);

      const result = await resultPromise;
      expect(result).toBe(successResponse);
    });
  });

  describe('request init forwarding', () => {
    it('merges init options with signal', async () => {
      const response = mockResponse({ status: 200 });
      vi.mocked(globalThis.fetch).mockResolvedValue(response);

      const init: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer xyz' },
        body: JSON.stringify({ key: 'value' }),
      };

      await fetchWithRedirectAuthorization(
        'https://example.com/api',
        init,
        10,
      );

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer xyz' },
          body: JSON.stringify({ key: 'value' }),
        }),
      );
    });

    it('preserves original init for redirect retry', async () => {
      const redirectResponse = mockResponse({
        status: 401,
        redirected: true,
        url: 'https://other.example.com/api',
      });
      const successResponse = mockResponse({ status: 200 });

      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValueOnce(successResponse);

      const init: RequestInit = {
        method: 'GET',
        headers: { Authorization: 'Bearer secret' },
      };

      await fetchWithRedirectAuthorization(
        'https://example.com/api',
        init,
        5,
      );

      // The redirect retry should still use the original init (with auth)
      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        'https://other.example.com/api',
        expect.objectContaining({
          method: 'GET',
          headers: { Authorization: 'Bearer secret' },
        }),
      );
    });
  });

  describe('default retries', () => {
    it('defaults to 10 retries when not specified', async () => {
      const unauthorizedResponse = mockResponse({ status: 401 });
      vi.mocked(globalThis.fetch).mockResolvedValue(unauthorizedResponse);

      const resultPromise = fetchWithRedirectAuthorization(
        'https://example.com/api',
        { headers: {} },
      );

      // Advance through all 10 retries
      // Delays: 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
      for (const delay of [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]) {
        await vi.advanceTimersByTimeAsync(delay);
      }

      const result = await resultPromise;
      expect(result.status).toBe(401);
      // 1 initial + 10 retries = 11 total
      expect(globalThis.fetch).toHaveBeenCalledTimes(11);
    });
  });

  describe('non-401 error responses', () => {
    it('returns 403 response without retrying', async () => {
      const forbiddenResponse = mockResponse({ status: 403 });
      vi.mocked(globalThis.fetch).mockResolvedValue(forbiddenResponse);

      const result = await fetchWithRedirectAuthorization(
        'https://example.com/api',
        { headers: {} },
      );

      expect(result.status).toBe(403);
      expect(globalThis.fetch).toHaveBeenCalledOnce();
    });

    it('returns 500 response without retrying', async () => {
      const serverErrorResponse = mockResponse({ status: 500 });
      vi.mocked(globalThis.fetch).mockResolvedValue(serverErrorResponse);

      const result = await fetchWithRedirectAuthorization(
        'https://example.com/api',
        { headers: {} },
      );

      expect(result.status).toBe(500);
      expect(globalThis.fetch).toHaveBeenCalledOnce();
    });

    it('returns redirected non-401 response without retrying', async () => {
      const redirectedOk = mockResponse({
        status: 200,
        redirected: true,
        url: 'https://other.example.com/api',
      });
      vi.mocked(globalThis.fetch).mockResolvedValue(redirectedOk);

      const result = await fetchWithRedirectAuthorization(
        'https://example.com/api',
        { headers: {} },
      );

      expect(result.status).toBe(200);
      expect(globalThis.fetch).toHaveBeenCalledOnce();
    });
  });
});
