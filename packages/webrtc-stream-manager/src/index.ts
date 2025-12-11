// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

export * from './types';
export { WebRTCStreamManager } from './web-rtc-stream-manager';
export * from './trackers';
export { generateWebRtcUrlFactory, fetchWithRedirectAuthorization, WithSkip, framesPerSecondFactory, frameRateTracker$, setMaxFpsOnBootstrap, throttleByFrameRate, getActualAvailableStreams, getActualAvailableStreamsWithFallback } from './utils';
export { CircuitBreaker, CircuitState, CircuitBreakerPresets, createCircuitBreaker, type CircuitBreakerConfig, type CircuitBreakerStats } from './circuit-breaker';
