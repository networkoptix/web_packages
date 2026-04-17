// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

/**
 * A generic Least Recently Used (LRU) cache with an optional eviction callback.
 *
 * Uses `Map` insertion order for O(1) LRU tracking: deleting and re-inserting
 * a key promotes it to the most-recently-used position.
 *
 * The `onEvict` callback is critical for resource cleanup (e.g. closing WebRTC
 * connections) and fixes the memory leak present in the v1 implementation.
 */
export class LRUCache<T> {
  private readonly cache = new Map<string, T>();

  constructor(
    private readonly maxSize: number,
    private readonly onEvict?: (key: string, value: T) => void,
  ) {}

  /** Retrieve a value by key, promoting it to most-recently-used. */
  get(key: string): T | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const value = this.cache.get(key)!;

    // Promote: delete and re-insert to move to end of Map iteration order
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }

  /** Insert or update a value. Evicts the LRU entry if at capacity. */
  set(key: string, value: T): void {
    // If the key already exists, remove it first so re-insert promotes it
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, value);
  }

  /** Check whether a key exists in the cache (without promoting it). */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove a key from the cache. Returns true if the key existed.
   *
   * Note: Unlike {@link clear}, this does NOT call the `onEvict` callback.
   * The caller is responsible for any cleanup of the removed value.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Remove all entries from the cache, calling onEvict for each. */
  clear(): void {
    if (this.onEvict) {
      for (const [key, value] of this.cache) {
        this.onEvict(key, value);
      }
    }
    this.cache.clear();
  }

  /** The number of entries currently in the cache. */
  get size(): number {
    return this.cache.size;
  }

  /** Iterate over all entries without promoting them (no LRU side-effects). */
  forEach(callback: (value: T, key: string) => void): void {
    for (const [key, value] of this.cache) {
      callback(value, key);
    }
  }

  /** Evict the least recently used entry (first key in Map iteration order). */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      const value = this.cache.get(firstKey)!;
      this.cache.delete(firstKey);
      this.onEvict?.(firstKey, value);
    }
  }
}
