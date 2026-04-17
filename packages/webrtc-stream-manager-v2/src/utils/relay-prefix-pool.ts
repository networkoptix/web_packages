// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

/**
 * Manages a fixed pool of random DNS prefixes per relay host for WebSocket
 * connection multiplexing.
 *
 * **Why:** Browsers limit concurrent connections per origin (~6). The
 * `{prefix}---{relayHost}` pattern gives each WebSocket its own origin.
 * Previously, a fresh random prefix was generated per connection, which
 * forced a cold DNS lookup + TLS handshake every time (7–13 s on slow relays).
 *
 * **How:** A fixed pool of N prefixes is generated per relay host. Connections
 * round-robin through the pool, so the browser's DNS cache and TCP/TLS
 * connection pool can be reused after the first warmup. On pool creation,
 * lightweight pings are fired to each prefixed hostname to prime the DNS cache.
 *
 * With a pool of 12 × ~6 connections per origin, up to ~72 concurrent
 * WebSocket connections are supported per relay host — more than enough.
 */

const DEFAULT_POOL_SIZE = 12;
const WARMUP_TIMEOUT_MS = 5_000;

export class RelayPrefixPool {
  private readonly pools = new Map<string, string[]>();
  private readonly indices = new Map<string, number>();
  private readonly poolSize: number;

  constructor(poolSize = DEFAULT_POOL_SIZE) {
    this.poolSize = poolSize;
  }

  /**
   * Get the next prefix for a relay host via round-robin.
   * Lazily initializes the pool (and triggers DNS warmup) on first access.
   */
  getPrefix(relayHost: string): string {
    let pool = this.pools.get(relayHost);
    if (!pool) {
      pool = this.initPool(relayHost);
    }
    const idx = (this.indices.get(relayHost) ?? 0) % pool.length;
    this.indices.set(relayHost, (idx + 1) % pool.length);
    return pool[idx];
  }

  /**
   * Generate a pool of random prefixes and kick off DNS warmup.
   */
  private initPool(relayHost: string): string[] {
    const prefixes: string[] = [];
    for (let i = 0; i < this.poolSize; i++) {
      prefixes.push(RelayPrefixPool.randomPrefix());
    }
    this.pools.set(relayHost, prefixes);
    this.indices.set(relayHost, 0);

    // Fire-and-forget DNS warmup for all prefixes.
    this.warmup(relayHost, prefixes);

    return prefixes;
  }

  /**
   * Send lightweight pings to each prefixed hostname to prime the browser's
   * DNS cache and TLS session cache. Failures are silently ignored —
   * this is best-effort optimization.
   */
  private warmup(relayHost: string, prefixes: string[]): void {
    for (const prefix of prefixes) {
      const url = `https://${prefix}---${relayHost}/api/ping`;
      fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        signal: AbortSignal.timeout(WARMUP_TIMEOUT_MS),
      }).catch(() => {
        // Expected — relay may reject or CORS-block the request.
        // The DNS resolution and TLS handshake still happen.
      });
    }
  }

  /** Generate a random 8-char alphanumeric prefix. */
  private static randomPrefix(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
