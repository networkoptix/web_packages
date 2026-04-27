// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { describe, it, expectTypeOf } from 'vitest';
import type {
  BaseTracker,
  BaseConnectionTracker,
  BytesReceivedTracker,
  MosScoreTracker,
  FocusTracker,
  WebRTCIssueDetectorWithState,
  IssuePayload,
  NetworkScores,
} from '../../../src/compat/tracker-types';
import { IssueType, IssueReason, EventType } from '../../../src/compat/tracker-types';

describe('compat: tracker-types (types-only)', () => {
  it('BaseTracker<Metric> makes the generic structurally observable via the phantom marker', () => {
    // The `__metric` phantom marker (see src/compat/tracker-types.ts) exists
    // solely so the `Metric` generic is structurally observable. A weaker
    // smoke like `toBeObject()` would pass for ANY non-primitive type — even
    // an empty interface — and would not catch the phantom being dropped.
    expectTypeOf<BaseTracker<number>['__metric']>().toEqualTypeOf<number | undefined>();
    expectTypeOf<BaseTracker<string>['__metric']>().toEqualTypeOf<string | undefined>();

    // Structural distinction: different Metric types are NOT mutually
    // assignable via the phantom. If `__metric` were removed, both sides
    // would collapse to the same shape and this would flip to `true`.
    type NumToStr = BaseTracker<number> extends BaseTracker<string> ? true : false;
    expectTypeOf<NumToStr>().toEqualTypeOf<false>();
  });

  it('BytesReceivedTracker extends BaseConnectionTracker shape', () => {
    type Check = BytesReceivedTracker extends BaseConnectionTracker<unknown> ? true : false;
    expectTypeOf<Check>().toEqualTypeOf<true>();
  });

  it('re-exports webrtc-issue-detector public types', () => {
    expectTypeOf<IssuePayload>().toBeObject();
    expectTypeOf<NetworkScores>().toBeObject();
    // IssueType is a string enum: union of string literals assignable to string.
    expectTypeOf<IssueType>().toMatchTypeOf<string>();
    expectTypeOf(IssueType.Network).toEqualTypeOf<IssueType.Network>();
  });

  it('re-exports IssueReason as a value+type pass-through', () => {
    // Mirrors the IssueType assertion above. IssueReason is a string enum in
    // webrtc-issue-detector; its members are string literal subtypes.
    expectTypeOf<IssueReason>().toMatchTypeOf<string>();
    expectTypeOf(IssueReason.ServerIssue).toEqualTypeOf<IssueReason.ServerIssue>();
  });

  it('re-exports EventType as a value+type pass-through', () => {
    // `EventType` is a string enum in webrtc-issue-detector; its members are
    // string literal subtypes. Verifying both the value-position import
    // (the `EventType` identifier below exists at runtime) and the
    // type-position usage guards the re-export against regression to
    // `export type { EventType }`, which would break value-position consumers.
    expectTypeOf<EventType>().toMatchTypeOf<string>();
    expectTypeOf(EventType.Issue).toEqualTypeOf<EventType.Issue>();
  });

  it('FocusTracker.metricName is the literal "focus"', () => {
    expectTypeOf<FocusTracker['metricName']>().toEqualTypeOf<'focus'>();
  });

  it('MosScoreTracker.metricName is the literal "mosScore"', () => {
    expectTypeOf<MosScoreTracker['metricName']>().toEqualTypeOf<'mosScore'>();
  });

  it('BytesReceivedTracker.metricName is the literal "bytesReceived"', () => {
    expectTypeOf<BytesReceivedTracker['metricName']>().toEqualTypeOf<'bytesReceived'>();
  });

  it('BytesReceivedTracker.targetReport is pinned to the literal "candidate-pair"', () => {
    // v1 assigns `override targetReport = RTCStatReportTypes.candidatePair`,
    // where the enum member's value is `'candidate-pair'`. Narrowing this to
    // the literal (vs the base `string` from BaseConnectionTracker) preserves
    // v1's discriminant for consumers that key off tracker subtype.
    expectTypeOf<BytesReceivedTracker['targetReport']>().toEqualTypeOf<'candidate-pair'>();
  });

  it('WebRTCIssueDetectorWithState exposes the v1 public surface', () => {
    // v1's class exposed `stopReporting` plus inherited handleNewPeerConnection /
    // watchNewPeerConnections / stopWatchingNewPeerConnections from
    // `webrtc-issue-detector`'s base class. v1 did NOT have `start` / `stop`
    // methods — the original plan draft was wrong on this point.
    expectTypeOf<WebRTCIssueDetectorWithState['stopReporting']>().toBeFunction();
    expectTypeOf<WebRTCIssueDetectorWithState['handleNewPeerConnection']>().toBeFunction();
    expectTypeOf<WebRTCIssueDetectorWithState['watchNewPeerConnections']>().toBeFunction();
    expectTypeOf<WebRTCIssueDetectorWithState['stopWatchingNewPeerConnections']>().toBeFunction();
  });
});
