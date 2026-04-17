// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

/** Internal representation of a cached entry with its expiry timestamp. */
interface TTLEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * A generic Time-To-Live (TTL) cache.
 *
 * Each entry is stored alongside an absolute expiry timestamp. On `get`, if the
 * entry has expired it is lazily removed and `undefined` is returned.
 *
 * Designed for auth token caching where entries should auto-expire (e.g. 1 hour).
 */
export class TTLCache<T> {
  private readonly cache = new Map<string, TTLEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  /** Retrieve a value by key. Returns `undefined` if missing or expired. */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /** Store a value with a TTL starting from now. */
  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /** Remove an entry. Returns `true` if the key existed. */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Remove all entries. */
  clear(): void {
    this.cache.clear();
  }
}
