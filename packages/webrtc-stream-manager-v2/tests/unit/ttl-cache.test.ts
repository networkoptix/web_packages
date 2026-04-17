// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TTLCache } from '../../src/utils/ttl-cache';

describe('TTLCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves values within TTL', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('token', 'abc123');

    expect(cache.get('token')).toBe('abc123');
  });

  it('returns undefined for expired entries', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('token', 'abc123');

    vi.advanceTimersByTime(1001);

    expect(cache.get('token')).toBeUndefined();
  });

  it('returns value just before expiry', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('token', 'abc123');

    vi.advanceTimersByTime(999);

    expect(cache.get('token')).toBe('abc123');
  });

  it('delete removes entry', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('token', 'abc123');

    expect(cache.delete('token')).toBe(true);
    expect(cache.get('token')).toBeUndefined();
    expect(cache.delete('token')).toBe(false);
  });

  it('clear removes all entries', () => {
    const cache = new TTLCache<string>(1000);
    cache.set('a', 'alpha');
    cache.set('b', 'beta');

    cache.clear();

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
