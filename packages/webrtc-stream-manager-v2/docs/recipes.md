# Recipes

// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

Seven self-contained recipes for the common tasks. Each one shows the full
import list and can be dropped into a TypeScript project verbatim. If you need
more context on what a class does, open the JSDoc on its import site or read
[architecture.md](./architecture.md).

## 1. Connect and attach to a video element

Minimum viable path from `configure` to first visible frame.

```typescript
import { StreamManager, TargetStream } from '@networkoptix/webrtc-stream-manager';

StreamManager.configure({
  relayUrl: '{systemId}.relay.vmsproxy.com',
  useRelayPrefix: true,
  maxBehind: 5,
  useUnreliableDataChannel: true,
});

const manager = StreamManager.getInstance();
const video = document.querySelector<HTMLVideoElement>('video#camera')!;

const connection = manager.connect({
  systemId: 'YOUR_SYSTEM_ID',
  cameraId: 'YOUR_CAMERA_ID',
  accessToken: 'YOUR_BEARER_TOKEN',
  targetStream: TargetStream.AUTO,
});

connection.on('track', ({ streams }) => {
  video.srcObject = streams[0];
  video.muted = true;
  video.autoplay = true;
});

connection.on('error', (err) => console.error('connection error', err));
```

## 2. Seek on timeline click

Seeking uses the data channel only — no reconnect. Works on both the native
`CameraConnection` and the legacy `WebRTCStreamManager` static API.

```typescript
// Native v2:
import { StreamManager } from '@networkoptix/webrtc-stream-manager';

const manager = StreamManager.getInstance();
const connection = manager.connect({ /* urlConfig */ });

// Seek to 2025-01-15T10:30:00Z (ms since epoch):
connection.updatePosition(1736937000000);
```

```typescript
// Legacy adapter — identical behavior under the hood:
import { WebRTCStreamManager } from '@networkoptix/webrtc-stream-manager';

WebRTCStreamManager.updateCameraPosition(
  { id: 'YOUR_CAMERA_ID', systemId: 'YOUR_SYSTEM_ID' },
  1736937000000,
);
```

The underlying DC message is `{"seek": <number>.0}` — integers are serialized
with a trailing `.0` because the VMS mediaserver parses the value with
RapidJSON's `IsDouble()`, not `IsInt64()`. You do not need to handle this
formatting yourself; the library takes care of it.

## 3. Pause, resume, and frame-by-frame advance

All three control the server-side stream via the data channel.

```typescript
import { StreamManager } from '@networkoptix/webrtc-stream-manager';

const manager = StreamManager.getInstance();
const connection = manager.connect({ /* urlConfig */ });

// Pause server-side encoding (does not pause the <video> element):
connection.sendPause();

// Resume:
connection.sendResume();

// Advance one frame while paused (useful for scrubbing):
connection.sendNextFrame();
```

Pausing the server is a bandwidth and compute saver — the `<video>` element
also stops receiving frames. Resume reverses it.

## 4. Force HIGH or LOW quality (override RADASS)

By default, RADASS picks the stream automatically. You can force a side.

```typescript
import { StreamManager, TargetStream } from '@networkoptix/webrtc-stream-manager';

const manager = StreamManager.getInstance();

// Force high-res for a specific connection:
const highResConn = manager.connect({
  systemId: 'SYS',
  cameraId: 'CAM',
  accessToken: 'TOKEN',
  targetStream: TargetStream.HIGH,
});

// Force low-res:
const lowResConn = manager.connect({
  systemId: 'SYS',
  cameraId: 'CAM2',
  accessToken: 'TOKEN',
  targetStream: TargetStream.LOW,
});
```

`AUTO` lets RADASS pick based on viewport size, focus, and quality metrics.
`HIGH` and `LOW` disable auto-upgrade/demotion for that connection.

## 5. Subscribe to analytics metadata

Analytics metadata (object tracks with bounding boxes) flows over the data
channel when enabled.

```typescript
import { StreamManager } from '@networkoptix/webrtc-stream-manager';

const manager = StreamManager.getInstance();
const connection = manager.connect({ /* urlConfig */ });

connection.enableMetadata();

const unsubscribe = connection.on('metadata', ({ metadata }) => {
  for (const obj of metadata.objectMetadataList) {
    console.log('detected', obj.trackId, obj.typeId, obj.boundingBox);
  }
});

// Stop receiving:
connection.disableMetadata();
unsubscribe();
```

## 6. Error handling and graceful disconnect

```typescript
import {
  StreamManager,
  ConnectionError,
} from '@networkoptix/webrtc-stream-manager';

const manager = StreamManager.getInstance();
const connection = manager.connect({ /* urlConfig */ });

connection.on('error', (err: ConnectionError) => {
  switch (err) {
    case ConnectionError.authorization:
      // Refresh the access token and reconnect.
      break;
    case ConnectionError.lostConnection:
      // Transient — the library will retry base connection automatically.
      break;
    default:
      console.error('webrtc error', err);
  }
});

// Disconnect a single camera (use the connection's own key to avoid
// hand-constructing the `${systemId}:${cameraId}` string):
manager.disconnect(connection.connectionKey);

// Disconnect everything and dispose the singleton (e.g., on logout):
await manager.closeAll();
```

## 7. Legacy-adapter drop-in for v1 consumers

If your code was written against v1's `WebRTCStreamManager` static API, it
keeps working without changes.

```typescript
import { WebRTCStreamManager } from '@networkoptix/webrtc-stream-manager';

WebRTCStreamManager.RELAY_URL = '{systemId}.relay.vmsproxy.com';
WebRTCStreamManager.USE_RELAY_PREFIX = true;
WebRTCStreamManager.USE_UNRELIABLE_DATA_CHANNEL = true;

const video = document.querySelector<HTMLVideoElement>('video')!;

const sub = WebRTCStreamManager.connect(
  {
    systemId: 'YOUR_SYSTEM_ID',
    cameraId: 'YOUR_CAMERA_ID',
    accessToken: 'YOUR_BEARER_TOKEN',
  },
  video,
).subscribe(([stream, error]) => {
  if (stream) video.srcObject = stream;
  if (error) console.error('legacy connect error', error);
});

// Later:
sub.unsubscribe();
await WebRTCStreamManager.closeAll();
```

Under the hood, the legacy adapter wraps the v2 `StreamManager` singleton.
Choose v2 native (`StreamManager` / `CameraConnection`) for new code —
the legacy facade will be removed in 0.2.0.
