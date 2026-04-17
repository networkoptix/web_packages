// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect, vi } from 'vitest';
import { LRUCache } from '../../src/utils/lru-cache';

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache<string>(3);
    cache.set('a', 'alpha');
    cache.set('b', 'beta');

    expect(cache.get('a')).toBe('alpha');
    expect(cache.get('b')).toBe('beta');
  });

  it('returns undefined for missing keys', () => {
    const cache = new LRUCache<string>(3);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts least recently used when at capacity', () => {
    const cache = new LRUCache<string>(2);
    cache.set('a', 'alpha');
    cache.set('b', 'beta');
    cache.set('c', 'gamma'); // should evict 'a'

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('beta');
    expect(cache.get('c')).toBe('gamma');
  });

  it('promotes accessed keys (get makes them recent)', () => {
    const cache = new LRUCache<string>(2);
    cache.set('a', 'alpha');
    cache.set('b', 'beta');

    // Access 'a' to promote it — now 'b' is the least recently used
    cache.get('a');

    cache.set('c', 'gamma'); // should evict 'b', not 'a'

    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('alpha');
    expect(cache.get('c')).toBe('gamma');
  });

  it('calls onEvict callback with key and value on eviction', () => {
    const onEvict = vi.fn();
    const cache = new LRUCache<string>(2, onEvict);

    cache.set('a', 'alpha');
    cache.set('b', 'beta');

    expect(onEvict).not.toHaveBeenCalled();

    cache.set('c', 'gamma'); // evicts 'a'

    expect(onEvict).toHaveBeenCalledOnce();
    expect(onEvict).toHaveBeenCalledWith('a', 'alpha');
  });

  it('delete removes a key', () => {
    const cache = new LRUCache<string>(3);
    cache.set('a', 'alpha');

    expect(cache.delete('a')).toBe(true);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.delete('a')).toBe(false);
  });

  it('has returns correct boolean', () => {
    const cache = new LRUCache<string>(3);

    expect(cache.has('a')).toBe(false);

    cache.set('a', 'alpha');
    expect(cache.has('a')).toBe(true);

    cache.delete('a');
    expect(cache.has('a')).toBe(false);
  });

  it('reports correct size', () => {
    const cache = new LRUCache<string>(3);

    expect(cache.size).toBe(0);

    cache.set('a', 'alpha');
    expect(cache.size).toBe(1);

    cache.set('b', 'beta');
    expect(cache.size).toBe(2);

    cache.delete('a');
    expect(cache.size).toBe(1);
  });

  it('clear removes all entries', () => {
    const cache = new LRUCache<string>(3);
    cache.set('a', 'alpha');
    cache.set('b', 'beta');
    cache.set('c', 'gamma');

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBeUndefined();
  });
});
