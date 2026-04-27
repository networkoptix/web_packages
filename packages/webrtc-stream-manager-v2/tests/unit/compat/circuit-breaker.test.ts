// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expect } from 'vitest';
import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerPresets,
  createCircuitBreaker,
} from '../../../src/circuit-breaker';

describe('compat: CircuitBreaker (verbatim from v1)', () => {
  it('opens after max failures and exposes stats', () => {
    const cb = createCircuitBreaker('smoke', { maxAttempts: 2, resetTimeout: 1000 });
    expect(cb.getStats().state).toBe(CircuitState.CLOSED);
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.getStats().state).toBe(CircuitState.OPEN);
  });

  it('exposes preset configs', () => {
    expect(CircuitBreakerPresets).toBeDefined();
    expect(Object.keys(CircuitBreakerPresets).length).toBeGreaterThan(0);
  });

  it('instantiates directly via the class', () => {
    const cb = new CircuitBreaker({ maxAttempts: 3, resetTimeout: 100 });
    expect(cb.getStats().state).toBe(CircuitState.CLOSED);
  });
});
