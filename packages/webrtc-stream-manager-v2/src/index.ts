// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

// WebRTC Stream Manager v2 — public API

// Types, enums, interfaces, and type guards
export * from './types';

// Core classes
export { Disposable } from './core/disposable';
export { SignalingChannel } from './core/signaling';
export { PeerConnectionWrapper } from './core/peer-connection';
export { CameraConnection } from './core/camera-connection';
export { MseRenderer, MseRecoveryError } from './core/mse-renderer';
export { StreamManager } from './core/stream-manager';

// Core config interfaces (re-exported for consumer convenience)
export type { StreamManagerConfig } from './core/stream-manager';
export type { CameraConnectionConfig } from './core/camera-connection';
export type { PeerConnectionConfig } from './core/peer-connection';
export type { MseRendererConfig } from './core/mse-renderer';
export type { QualitySnapshot, MosInput } from './strategies/quality-monitor';
export type { RetryConfig } from './strategies/retry-policy';

// Strategies
export { QualityMonitor } from './strategies/quality-monitor';
export { RadassController } from './strategies/radass-controller';
export type { CameraInfo, RadassHost } from './strategies/radass-controller';
export {
  LqReason,
  DEFAULT_RADASS_CONFIG,
} from './strategies/radass-types';
export type {
  CameraRadassState,
  RadassConfig,
} from './strategies/radass-types';

// Utilities
export {
  isH265Codec,
  browserSupportsH265WebRTC,
  codecRequiresMse,
} from './utils/codecs';
export {
  getActualAvailableStreams,
  getActualAvailableStreamsWithFallback,
  getNonTranscodingStreams,
} from './utils/streams';
export { fetchWithRedirectAuthorization } from './utils/relay-fetch';
export {
  frameRateTracker$,
  throttleByFrameRate,
  setMaxFpsOnBootstrap,
} from './utils/frame-rate';
export type { FrameRateSnapshot } from './utils/frame-rate';

// Legacy facade for zero-change migration from v1
export { WebRTCStreamManager } from './facade/legacy-adapter';
