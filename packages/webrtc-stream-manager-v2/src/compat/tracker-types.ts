// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

/**
 * Type-only compatibility shims for v1's tracker module.
 *
 * These `type` / `interface` declarations mirror the public shapes of v1's
 * tracker classes so that consumers of `@networkoptix/webrtc-stream-manager`
 * who imported tracker names in type positions continue to compile after the
 * v2 migration at version 0.1.29.
 *
 * **Runtime behavior:** the actual v1 tracker runtime classes are NOT shipped
 * in v2. Any consumer code that attempts `new BytesReceivedTracker(...)` will
 * fail at tsc with error TS2693 ("only refers to a type"). Scheduled for
 * removal in 0.2.0.
 *
 * For current tracker-like functionality, use v2's native QualityMonitor and
 * RadassController modules.
 */

// Re-export webrtc-issue-detector public types so consumers that imported
// these names (either directly from webrtc-issue-detector or believed they
// were available from the v1 barrel) continue to compile.
export type {
  IssuePayload,
  IssueDetector,
  IssueDetectorResult,
  NetworkScores,
  NetworkScore,
  NetworkQualityStatsSample,
  StatsParsingFinishedPayload,
  WebRTCStatsParsed,
  ParsedInboundAudioStreamStats,
  ParsedOutboundAudioStreamStats,
  ParsedInboundVideoStreamStats,
  ParsedOutboundVideoStreamStats,
  ParsedConnectionStats,
  ParsedRemoteInboundStreamStats,
  ParsedRemoteOutboundStreamStats,
  RemoteParsedStats,
  IceCandidateConnectionStats,
  Logger,
} from 'webrtc-issue-detector';

// IssueType, IssueReason, and EventType are runtime enums in
// webrtc-issue-detector. This `export { ... }` form (without a leading `type`
// keyword) re-exports them in both value and type positions: consumers can
// write `IssueType.Network` (value position: references the enum member at
// runtime) *and* `const t: IssueType = ...` (type position: references the
// enum's union-of-members type). The underlying runtime values are shipped
// by the external dep, not by this package.
export { IssueType, IssueReason, EventType } from 'webrtc-issue-detector';

// --- BaseTracker<Metric> -----------------------------------------------
/**
 * @deprecated Since 0.1.29. Runtime class not shipped. Use v2's
 * `QualityMonitor` or pin to `@networkoptix/webrtc-stream-manager@<=0.1.27`.
 */
export interface BaseTracker<Metric = unknown> {
  // Mirrors v1 mutability: these fields are declared as plain `public` (or
  // plain parameter properties) on v1's `BaseTracker` class and are assigned
  // at runtime (e.g. `updateConnection` reassigns `connection`). Keeping
  // them mutable in the compat interface preserves consumer code that wrote
  // `tracker.metricThreshold = 4` against v1.
  sampleSize: number;
  metricName: string;
  weight: number;
  priorityWeight: number;
  metricThreshold: number;
  // `players` is a getter on v1 — consumers cannot assign to it — so it
  // remains readonly here.
  readonly players: number;
  connection: unknown;
  destroy: () => void;
  getMetric(...args: unknown[]): unknown;
  updateMetric(now: number, ...args: unknown[]): unknown;
  updatePlayers(players: HTMLVideoElement[]): void;
  updateConnection(connection: unknown): void;
  toMetric(): Record<string, unknown>;
  toPriority(): number;
  toSuggestedStream(): Record<string, 'high' | 'low'>;
  suggestedStream(): 'high' | 'low';
  getMetricMemoryUsage(): number;
  getMetricStats(): {
    currentEntries: number;
    maxEntries: number;
    memoryUsageBytes: number;
    memoryUsageKB: number;
    utilizationPercent: number;
  };
  // Phantom marker so `Metric` is structurally observable and the interface
  // body cannot be satisfied by a bare empty object. Does not exist at
  // runtime — consumers using the name in type positions are unaffected.
  readonly __metric?: Metric;
}

// --- BaseConnectionTracker<RTCReportType> ------------------------------
/**
 * @deprecated Since 0.1.29. See BaseTracker.
 */
export interface BaseConnectionTracker<RTCReportType = unknown> extends BaseTracker<number> {
  // v1 declares `public targetReport = RTCStatReportTypes.inboundRtp` (plain,
  // not readonly) and subclasses override it via `override targetReport = ...`.
  targetReport: string;
  isTargetReport(report: RTCStats): boolean;
  processInboundReport(report?: RTCReportType): number;
}

// --- BytesReceivedTracker ---------------------------------------------
/**
 * @deprecated Since 0.1.29. See BaseTracker.
 */
export interface BytesReceivedTracker extends BaseConnectionTracker<unknown> {
  // Subclass fields on v1 are plain assignments (no `readonly`); literal
  // types are preserved so consumers get the narrow discriminant v1 provided.
  metricName: 'bytesReceived';
  weight: 1;
  priorityWeight: 0;
  targetReport: 'candidate-pair';
}

// --- MosScoreTracker --------------------------------------------------
/**
 * @deprecated Since 0.1.29. See BaseTracker.
 */
export interface MosScoreTracker extends BaseTracker<number> {
  metricName: 'mosScore';
  weight: 5;
  priorityWeight: 0;
  currentValue: number;
  getMetric(reset?: boolean): number;
  updateMetric(time: number): number;
}

// --- FocusTracker -----------------------------------------------------
/**
 * @deprecated Since 0.1.29. See BaseTracker.
 */
export interface FocusTracker extends BaseTracker<number> {
  metricName: 'focus';
  weight: 0;
  priorityWeight: 5;
  calculateFocusScore(): number;
  getMetric(reset?: boolean): number;
  updateMetric(time: number): number;
}

// --- WebRTCIssueDetectorWithState -------------------------------------
/**
 * @deprecated Since 0.1.29. Runtime class not shipped. Use v2's
 * `QualityMonitor` or pin to `@networkoptix/webrtc-stream-manager@<=0.1.27`.
 *
 * Shape mirrors v1's `WebRTCIssueDetectorWithState` which extends
 * `WebRTCIssueDetector` from the external `webrtc-issue-detector` package.
 * Only the public surface that v1 consumers could access is modelled.
 */
export interface WebRTCIssueDetectorWithState {
  readonly eventEmitter: unknown;
  stopReporting: () => void;
  watchNewPeerConnections(): void;
  stopWatchingNewPeerConnections(): void;
  handleNewPeerConnection(pc: RTCPeerConnection): void;
}
