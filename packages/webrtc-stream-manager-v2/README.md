# @networkoptix/webrtc-stream-manager-v2

WebRTC streaming library for connecting to Nx Meta VMS cameras with automatic quality management, retry logic, and MSE fallback.

## Installation

```bash
npm install @networkoptix/webrtc-stream-manager-v2
```

## Quick Start

```typescript
import { StreamManager } from '@networkoptix/webrtc-stream-manager-v2';

// 1. Configure the singleton (once at app startup)
StreamManager.configure({
  relayUrl: '{systemId}.relay.vmsproxy.com',
  useRelayPrefix: true,
  maxBehind: 5,
  useUnreliableDataChannel: true,
});

// 2. Connect to a camera
const manager = StreamManager.getInstance();
const connection = manager.connect({
  systemId: '{system_id}',
  cameraId: '{camera_id}',
  accessToken: '{access_token}',
  targetStream: TargetStream.AUTO,
});

// 3. Attach the stream to a video element
const video = document.querySelector('video');
connection.on('track', ({ track, streams }) => {
  video.srcObject = streams[0];
  video.muted = true;
  video.autoplay = true;
});

connection.on('error', (error) => {
  console.error('Connection error:', error);
});
```

## API Overview

### StreamManager

Global singleton that manages all camera connections, runs a periodic quality optimizer, and provides the high-level connection API.

| Method | Description |
|---|---|
| `StreamManager.configure(config)` | Initialize the singleton with a `StreamManagerConfig`. Must be called before `getInstance()`. |
| `StreamManager.getInstance()` | Return the configured singleton. Throws if `configure()` has not been called. |
| `StreamManager.reset()` | Dispose the current instance and clear the singleton. |
| `manager.connect(urlConfig, videoElement?)` | Get or create a `CameraConnection` for a camera. Returns an existing connection if one exists for the same camera. |
| `manager.disconnect(connectionKey)` | Disconnect and dispose a specific camera connection. |
| `manager.updatePosition(positionMs?)` | Update playback position for all connections (milliseconds). |
| `manager.updateSpeed(speed)` | Update playback speed for all connections. |
| `manager.setPlaying(playing)` | Set the playing state. When paused, the quality optimizer stops upgrading connections. |
| `manager.closeAll()` | Dispose all connections and the StreamManager itself. |

### CameraConnection

Per-camera connection that manages an always-alive base stream and an optional on-demand high-res upgrade stream. Emits events for tracks, timestamps, errors, state changes, and analytics metadata.

#### Events

Subscribe to events using `connection.on(event, listener)`, which returns an unsubscribe function:

```typescript
const unsub = connection.on('track', ({ track, streams }) => { ... });
// Later:
unsub();
```

| Event | Detail Type | Description |
|---|---|---|
| `track` | `TrackEventDetail` | A remote media track was received or switched. Contains `track` and `streams`. |
| `error` | `ConnectionError` | A connection error occurred (e.g., `lostConnection`, `authorization`). |
| `statechange` | `StateChangeEventDetail` | Peer connection state changed. Contains `state` and `previousState`. |
| `timestamp` | `TimestampEventDetail` | Timestamp received from the data channel. Contains `timestamp`, `timestampMs`, and `rtpTimestamp`. |
| `metadata` | `MetadataEventDetail` | Analytics object metadata received from the data channel. |
| `buffer` | `ArrayBuffer` | Raw media buffer (used by MSE renderer). |
| `msefallback` | `undefined` | Connection fell back from SRTP to MSE delivery. |
| `datachannel` | `string \| ArrayBuffer` | Raw data channel message. |

#### Connection States

```typescript
enum PeerState {
  connecting = 'connecting',
  connected = 'connected',
  failed = 'failed',
}
```

#### Control Methods

| Method | Description |
|---|---|
| `updatePosition(positionMs)` | Seek to a playback position. |
| `updateSpeed(speed)` | Update playback speed (`number` or `'unlimited'`). |
| `sendPause()` | Pause the server-side stream. |
| `sendResume()` | Resume the server-side stream. |
| `sendNextFrame()` | Advance by one frame (when paused). |
| `enableMetadata()` | Enable analytics metadata on the data channel. |
| `disableMetadata()` | Disable analytics metadata on the data channel. |
| `requestHighRes()` | Request upgrade to high-res stream. |
| `releaseHighRes()` | Release high-res and fall back to base stream. |

## Configuration

### StreamManagerConfig

| Option | Type | Default | Description |
|---|---|---|---|
| `relayUrl` | `string` | (required) | Relay URL template, e.g. `"{systemId}.relay.vmsproxy.com"` |
| `useRelayPrefix` | `boolean` | (required) | Whether to prefix relay URL for WebSocket connection multiplexing. |
| `maxBehind` | `number` | (required) | Max seconds behind live before reconnect. |
| `useUnreliableDataChannel` | `boolean` | (required) | Use unreliable data channel transport. |
| `logger` | `Console` | `undefined` | Optional logger for debug output. |
| `iceServers` | `RTCIceServer[]` | Google STUN servers | ICE servers for WebRTC peer connections. |
| `maxConcurrentHighRes` | `number` | `4` | Max concurrent high-res streams. The quality optimizer promotes the best candidates up to this limit. |
| `optimizerIntervalMs` | `number` | `3000` | Quality optimizer polling interval in milliseconds. |

### WebRtcUrlConfig

| Option | Type | Required | Description |
|---|---|---|---|
| `systemId` | `string` | Yes | The Nx Meta system identifier. |
| `cameraId` | `string` | Yes | The camera device identifier. |
| `accessToken` | `string \| () => string \| Promise<string>` | Yes | Bearer token or factory function for authentication. |
| `targetStream` | `TargetStream` | No | Stream preference: `AUTO`, `HIGH`, or `LOW`. Defaults to `AUTO`. |
| `serverId` | `string` | No | Target server GUID (for multi-server systems). |
| `position` | `number` | No | Initial playback position in milliseconds. |
| `speed` | `number \| 'unlimited'` | No | Playback speed. |
| `availableStreams` | `AvailableStreams[]` | No | Available streams from camera data. Skips API detection if provided. |
| `mediaStreams` | `Stream[]` | No | Full media stream data with codec info. Enables codec-aware stream selection. |
| `connectionContext` | `ConnectionContext` | No | Pre-resolved host/relay context. Skips ping/host resolution if provided. |
| `apiContext` | `ApiContext` | No | Pre-resolved API version and one-time token. Skips version detection if provided. |

## Features

### Automatic Quality Optimization

The `StreamManager` runs a periodic quality optimizer that promotes and demotes camera connections between high-res and low-res based on quality metrics and viewport focus. Set `targetStream` to `AUTO` (the default) to opt in, or use `HIGH`/`LOW` to override.

### MSE Fallback

When the camera codec requires transcoding (e.g., MJPEG), the library automatically falls back from WebRTC SRTP to Media Source Extensions (MSE) delivery. This avoids unnecessary server-side transcoding by receiving the native codec via MSE.

### Retry and Reconnection

- Base (low-res) connections retry aggressively (up to 10 attempts with exponential backoff).
- Upgrade (high-res) connections retry gently (up to 3 attempts) and fall back silently to base on failure.
- Connections are held in an LRU cache with automatic disposal on eviction.

### Analytics Metadata

When `enableMetadata` is active, the data channel delivers `ObjectMetadataPacket` messages containing detected objects with bounding boxes, track IDs, attributes, and confidence scores.

## Legacy Adapter (v1 Migration)

For projects using the v1 `WebRTCStreamManager` API, a drop-in legacy adapter is provided:

```typescript
import { WebRTCStreamManager } from '@networkoptix/webrtc-stream-manager-v2';

// Same API as v1 — uses v2 internals
WebRTCStreamManager.RELAY_URL = '{systemId}.relay.vmsproxy.com';

WebRTCStreamManager.connect(webRtcConfig, videoElement).subscribe(([stream, error]) => {
  if (stream) videoElement.srcObject = stream;
  if (error) handleError(error);
});
```

The legacy adapter wraps the v2 `StreamManager` singleton and bridges its event-based API to the RxJS Observable contract expected by v1 consumers. No code changes are needed for migration.

## Examples

See the [`webrtc-stream-manager-example-v2`](../../examples/webrtc-stream-manager-example-v2/) directory for a working demo application.

## License

MPL-2.0
