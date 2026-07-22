# Architecture

// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

Three-part overview: which class owns what, how data moves through a typical
connection, and when to use which API layer.

## Component map

The runtime hierarchy, from app entry-point down:

### `StreamManager`

Singleton. One per application. Owns:

- An LRU-bounded `Map<connectionKey, CameraConnection>` so abandoned connections
  get disposed automatically on eviction (fixing the v1 leak where closed
  consumers could leave live peers alive).
- A TTL-bounded cache of resolved relay hosts so repeated connects to the same
  system don't re-run host resolution.
- A `RadassController` that ticks periodically and makes promote/demote
  decisions across all tracked cameras.

Entrypoints: `StreamManager.configure(config)`, `StreamManager.getInstance()`,
`manager.connect(urlConfig, videoElement?)`, `manager.closeAll()`.

### `CameraConnection`

One per camera connection key (a `"systemId:cameraId"` pair). Owns:

- An always-alive base peer (normally low-res) handled by
  `PeerConnectionWrapper`.
- An optional high-res upgrade peer, spun up and torn down by
  `RadassController` decisions and user overrides.
- A `QualityMonitor` feeding observations into RADASS.
- The consumer-facing `EventTarget`-style API (`on('track')`,
  `on('timestamp')`, `on('metadata')`, `on('error')`, `on('statechange')`,
  `on('msefallback')`).

Entrypoints: `connection.updatePosition`, `connection.updateSpeed`,
`connection.sendPause/sendResume/sendNextFrame`,
`connection.enableMetadata/disableMetadata`, `connection.on(...)`.

### `PeerConnectionWrapper`

One per actual `RTCPeerConnection`. Wraps the signaling channel, the peer, and
the data channel. Emits raw events consumed by `CameraConnection`. Not usually
touched directly.

### `SignalingChannel`

WebSocket to the VMS mediaserver that carries the SDP offer/answer exchange and
ICE candidates. Opaque to consumers.

### `MseRenderer`

Transcoding-avoidance fallback path. When a camera's native codec requires
transcoding on the server side (MJPEG, some H.265 on browsers that don't
support it natively), the library emits an `msefallback` event and routes
bytes through `MseRenderer` + a MediaSource instead of over SRTP. The `<video>`
API is unchanged — only the delivery mechanism differs.

### `QualityMonitor` (strategy)

Per-connection. Observes `RTCPeerConnection.getStats()` results on an interval,
computes a Mean Opinion Score using the ITU-T E-model (simplified, clamped to
[1, 5]), and emits `QualitySnapshot`s that RADASS consumes.

### `RadassController` (strategy)

Global across all tracked cameras. Each tick, it looks at viewport sizes,
focus hints, concurrent-high-res limits, and quality observations, and
promotes/demotes connections between low and high streams. Recovery from a
performance demotion is gated by a hysteresis band (rendered height must
exceed `hysteresisHeightPx`, default 230 px), a MOS threshold, a per-camera
switch cooldown, and an anti-thrash lockout (`antiThrashRetryMs`, default
10 minutes) that fires when a promoted camera is immediately demoted again.
Size-driven demotion clears automatically when the camera's rendered area
grows back above threshold.

## Data flow through a typical connect

1. `StreamManager.connect(urlConfig)` produces a `CameraConnection` (new or
   cached by key).
2. `CameraConnection` opens the always-alive base peer via a
   `PeerConnectionWrapper` + `SignalingChannel`.
3. SDP offer/answer via the signaling WebSocket; ICE candidates flow.
4. The peer reaches `connected`. A `track` event fires with a `MediaStream`.
5. `QualityMonitor` begins sampling `getStats()`; `RadassController` ticks
   start factoring this camera in.
6. Optional: `RadassController` decides to request a high-res upgrade peer;
   `CameraConnection` opens a second `PeerConnectionWrapper`. On `track`, the
   consumer's video element seamlessly switches to the upgrade stream.
7. Data-channel messages (timestamps, analytics metadata when enabled, seek/
   pause control) flow bidirectionally alongside media.

Codec-aware short-circuit: before step 2, `CameraConnection` checks
`mediaStreams` metadata. If the only viable stream requires transcoding, it
skips SRTP and goes straight to `MseRenderer` from the start.

## Archive playback: frame stepping & continuous reverse (`src/stepping/`)

Frame-exact archive navigation runs on a companion **fetch session** (an
MSE/fMP4 `MediaFetchSession`, independent of the tile's SRTP peer), decoded with
WebCodecs — never the live video element. One layer stack serves both
directions:

- **`BackfillFetcher`** owns the fetch session and pipes it through the
  `Fmp4Parser` into an anchored **`SampleStore`** (encoded-domain, byte-capped).
  It aims windows backward (`extendBack`), verifies landings, and pauses
  delivery at each window end. `setWindowMs` resizes the per-aim window at
  runtime.
- **`GopDecoder`** decodes a whole key-led GOP per request and caches every
  frame tick-keyed under a byte cap, with directional trims (`trimAbove` /
  `trimBelow`).
- **`FrameStepper`** — the click-driven prev/next state machine. Owns its own
  decoder; borrows the fetcher.
- **`ReversePlayer`** — the clock-paced continuous reverse presenter (−1×/−2×/
  −4×). A sibling of `FrameStepper` (not a mode of it), it composes the SAME
  fetcher/store with its OWN decoder. The pacing loop derives the target archive
  tick from a drift-free wallclock↔archive anchor and keys one wakeup (an
  injectable `PacerClock`) to the next real sample tick; late wakes paint the
  floor sample (skip, never slow-motion). Supply is kept ahead by widening the
  window and chaining `extendBack`; starvation is honest `buffering`, bounded
  then `autostopped` INTO stepping (never disabled for supply). Holes are jumped,
  not crawled. At a chunk's start `extendBack` gap-hops: when the default ask
  would fall in a known recording gap, it re-aims at the previous chunk's tail
  (chunk oracle), and the archive-start conclusion only stands when the oracle
  agrees no earlier data exists.
- **`PlaybackCoordinator`** enforces exactly one engaged consumer of the shared
  fetcher and implements the stepping↔reverse handoffs (`playReverse` /
  `pauseReverse` / `enterStepping`), including the autostop-into-stepping landing.

One uniform fetch-session **speed = 4** serves stepping and every reverse rate
(all |rate| ≤ 4), so rate changes are presentation-only — no session reopen.

## Which API layer to pick

| Job | Use | Why |
|---|---|---|
| "Display a camera in my app" | `StreamManager.connect()` → subscribe to `track` | Default path; RADASS / caching / MSE fallback are automatic |
| "Scrub a timeline" | `connection.updatePosition(ms)` | DC-only seek, no reconnect |
| "Force a specific stream quality" | `TargetStream.HIGH` or `TargetStream.LOW` in urlConfig | Disables auto promote/demote for this connection |
| "Get bounding-box analytics" | `connection.enableMetadata()` + `on('metadata', …)` | Server-provided object tracks over DC |
| "Observe connection state" | `on('statechange', …)` or the `PeerState` enum | Progresses connecting → connected → failed |
| "React to codec-transcoding fallback" | `on('msefallback', …)` | Fires when the library switches delivery path |
| "Migrate a v1 app without changes" | `WebRTCStreamManager` (legacy facade) | RxJS Observable API; slated for removal in 0.2.0 |
| "Inspect raw peer state / tweak reconnect policy" | `PeerConnectionWrapper`, `RetryConfig` overrides | Advanced — rarely needed |

The legacy `WebRTCStreamManager` facade is the only class you should avoid for
new code. Everything else in the public surface is supported going forward.
