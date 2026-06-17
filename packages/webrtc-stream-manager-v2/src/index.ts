// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

// WebRTC Stream Manager v2 — public API

// Types, enums, interfaces, and type guards
export * from './types';

// Core classes
export { Disposable } from './core/disposable';
export { SignalingChannel } from './core/signaling';
export { PeerConnectionWrapper } from './core/peer-connection';
export { CameraConnection } from './core/camera-connection';
export { MediaFetchSession } from './core/media-fetch-session';
export { MseRenderer, MseRecoveryError } from './core/mse-renderer';
export { StreamManager } from './core/stream-manager';

// Core config interfaces (re-exported for consumer convenience)
export type { StreamManagerConfig, FetchSessionOptions } from './core/stream-manager';
export type { CameraConnectionConfig } from './core/camera-connection';
export type { MediaFetchSessionConfig } from './core/media-fetch-session';

// Prev-frame stepping pipeline
export { Fmp4Parser } from './stepping/fmp4-parser';
export type {
  Fmp4InitSegment,
  Fmp4ParserEvent,
  Fmp4Sample,
  Fmp4TrackInfo,
  Fmp4VideoFragment,
} from './stepping/fmp4-parser';
export { SampleStore } from './stepping/sample-store';
export type {
  AnchorPair,
  CoverageInterval,
  InsertResult,
  StoreSample,
} from './stepping/sample-store';
export { GopDecoder } from './stepping/gop-decoder';
export type { DecodeRun, GopDecoderConfig } from './stepping/gop-decoder';
export { BackfillFetcher } from './stepping/backfill-fetcher';
export type {
  BackfillFetcherConfig,
  BackfillFetcherState,
} from './stepping/backfill-fetcher';
export { FrameStepper } from './stepping/frame-stepper';
export type {
  FrameStepperConfig,
  FrameStepperState,
} from './stepping/frame-stepper';
export { createStepperOpenSession } from './stepping/open-session-adapter';
export type { StepperSessionOptions } from './stepping/open-session-adapter';
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

// ──────────────────────────────────────────────────────────────
// Legacy compatibility surface (ported from v1 for 0.1.x drop-in)
// Scheduled for removal in 0.2.0. See facade/legacy-adapter.ts
// and compat/tracker-types.ts for the full compat contract.
// ──────────────────────────────────────────────────────────────

// CircuitBreaker module (verbatim copy from v1)
export {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerPresets,
  createCircuitBreaker,
  type CircuitBreakerConfig,
  type CircuitBreakerStats,
} from './circuit-breaker';

// Net-new v1 utilities not already in v2's src/utils/
export {
  generateWebRtcUrlFactory,
  WithSkip,
  framesPerSecondFactory,
} from './utils/legacy-compat';

// Tracker types (TypeScript type-only — no runtime classes ship)
export type {
  BaseTracker,
  BaseConnectionTracker,
  BytesReceivedTracker,
  MosScoreTracker,
  FocusTracker,
  WebRTCIssueDetectorWithState,
  IssuePayload,
  IssueDetector,
  IssueDetectorResult,
  NetworkScores,
  StatsParsingFinishedPayload,
  WebRTCStatsParsed,
} from './compat/tracker-types';

// Runtime enums (value + type) pass-through from webrtc-issue-detector
export {
  IssueType,
  IssueReason,
  EventType,
} from './compat/tracker-types';

// Legacy facade for zero-change migration from v1
export { WebRTCStreamManager } from './facade/legacy-adapter';
