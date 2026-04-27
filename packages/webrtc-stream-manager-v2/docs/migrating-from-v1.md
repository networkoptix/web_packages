# Migrating from v1 (0.1.x) to v2 (0.1.29+)

// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

## At a glance

`@networkoptix/webrtc-stream-manager@0.1.29` ships the v2 architecture while
preserving full drop-in compatibility for v1 consumers. Caret-range consumers
(`^0.1.x`) auto-upgrade on next install and, in most cases, need zero code
changes. The legacy surface will be removed in `0.2.0` — begin migrating to
v2 native classes (`StreamManager`, `CameraConnection`) at your own pace
before then.

## What's preserved verbatim at 0.1.29

All of these continue to work exactly as in v1. Imports from
`@networkoptix/webrtc-stream-manager` remain valid:

- `WebRTCStreamManager` class (static API: `connect`, `closeAll`,
  `updatePosition`, `updateCameraPosition`, `togglePlaying`, `updateSpeed`,
  `pause`, `play`, `nextFrame`, `getInstance`, static config properties like
  `RELAY_URL`, `USE_RELAY_PREFIX`, `USE_UNRELIABLE_DATA_CHANNEL`, `maxBehind`,
  `logger`, `position`, `hasPerformanceIssues$`).
- `CircuitBreaker`, `CircuitState`, `CircuitBreakerPresets`,
  `createCircuitBreaker`, `CircuitBreakerConfig` (type), `CircuitBreakerStats`
  (type).
- `generateWebRtcUrlFactory`, `WithSkip`, `framesPerSecondFactory`.
- All utilities already shared across both versions
  (`throttleByFrameRate`, `frameRateTracker$`, `setMaxFpsOnBootstrap`,
  `ConnectionError`, `AvailableStreams`, `TargetStream`, `ApiVersions`,
  `getActualAvailableStreamsWithFallback`, `getActualAvailableStreams`,
  `isRequiresTranscoding`).

## What's narrowed to types-only at 0.1.29

These symbols still appear in TypeScript import declarations, but only as
types — the runtime class implementations no longer ship. In a TypeScript
consumer, `new BytesReceivedTracker(…)` is rejected at compile time
("exported using 'export type'"). In a plain JavaScript consumer, the same
call throws `TypeError: BytesReceivedTracker is not a constructor` at runtime.

- `BaseTracker`, `BaseConnectionTracker`
- `BytesReceivedTracker`
- `MosScoreTracker`
- `FocusTracker`
- `WebRTCIssueDetectorWithState`
- `IssuePayload`, `IssueDetector`, `IssueDetectorResult`, `NetworkScores`,
  `StatsParsingFinishedPayload`, `WebRTCStatsParsed`

The runtime enum values `IssueType`, `IssueReason`, `EventType` are passed
through from `webrtc-issue-detector` and remain usable at runtime.

**If your code instantiated trackers directly:** migrate to v2's
`QualityMonitor` or pin to `@networkoptix/webrtc-stream-manager@<=0.1.27`
until you can.

## What changed behaviorally under the hood

Visible from the outside if you squint:

- Connection cache is LRU-bounded (default 100); evicted connections are
  disposed automatically. v1 allowed orphaned peers to accumulate.
- Each camera now runs a dual-peer topology: an always-alive low-res base
  connection plus an optional on-demand high-res upgrade. `TargetStream.AUTO`
  lets RADASS decide; `HIGH` / `LOW` force one side.
- Seek is data-channel-only (`{"seek": N.0}` over DC). No reconnect on
  position changes. v1 reconnected for live↔archive transitions.
- MSE fallback is codec-aware up front: if the only viable stream would
  require transcoding, the library skips SRTP entirely and delivers via
  MediaSource from the first `track` event.
- License and artifact layout unchanged: MPL-2.0, CommonJS-interop ESM,
  TypeScript declarations in `dist/types/`.

## Before / after

### (a) Caret-range consumer — no change required

Your `package.json` says `"@networkoptix/webrtc-stream-manager": "^0.1.27"`.
After `0.1.29` promotes to `latest`, your next `npm install` picks up the v2
build via the legacy adapter. Your existing code keeps compiling and running.

### (b) Moving to v2 native

v1 pattern:

```typescript
import { WebRTCStreamManager } from '@networkoptix/webrtc-stream-manager';

WebRTCStreamManager.RELAY_URL = '{systemId}.relay.vmsproxy.com';
const sub = WebRTCStreamManager.connect({ systemId, cameraId, accessToken }, video)
  .subscribe(([stream, error]) => {
    if (stream) video.srcObject = stream;
  });
```

v2 native equivalent:

```typescript
import { StreamManager, TargetStream } from '@networkoptix/webrtc-stream-manager';

StreamManager.configure({
  relayUrl: '{systemId}.relay.vmsproxy.com',
  useRelayPrefix: true,
  maxBehind: 5,
  useUnreliableDataChannel: true,
});

const manager = StreamManager.getInstance();
const connection = manager.connect({
  systemId,
  cameraId,
  accessToken,
  targetStream: TargetStream.AUTO,
});

connection.on('track', ({ streams }) => { video.srcObject = streams[0]; });
connection.on('error', (err) => console.error(err));
```

Key differences:

- Config lives on the `StreamManager` singleton instead of static properties.
- The subscription model is event-based (`on(event, …)`) rather than RxJS;
  the legacy facade continues to wrap v2 with an RxJS Observable if you
  prefer that style.
- Consumer gets a `CameraConnection` object instead of a `MediaStream`
  tuple — richer surface for seek, pause, metadata, etc.

## 0.2.0 roadmap

At `0.2.0` (a future breaking release), all `0.1.x`-compat surface is deleted:

- The `WebRTCStreamManager` facade class and the `src/facade/` directory.
- The `CircuitBreaker` module and its re-exports.
- The ported utilities (`generateWebRtcUrlFactory`, `WithSkip`,
  `framesPerSecondFactory`).
- The tracker type-only declarations (`BaseTracker`, `MosScoreTracker`, etc.)
  and the runtime enum pass-throughs (`IssueType`, `IssueReason`, `EventType`).
- The `webrtc-issue-detector` dependency.

To prepare for 0.2.0: ensure your consumer code does not import any of the
narrowed-to-types-only symbols for runtime use, and migrate off the legacy
facade into the native `StreamManager` / `CameraConnection` API when
convenient.
