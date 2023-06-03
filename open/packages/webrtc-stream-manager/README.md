![Nx Meta Logo](https://meta.nxvms.com/static/images/logo.png)

# WebRTC Stream Manager ![License: MPL--2.0"](https://img.shields.io/badge/License-MPL--2.0-yellow.svg)

## What is `@networkoptix/webrtc-stream-manager`?

This package simplifies playing back videos via `WebRTC` from `Nx Meta VMS` mediaservers versions 5.1 or later.

## What can it do?

The exported `WebRTCStreamManager` class handles establishing a WebRTC connection with the mediaserver.
When initializing the connection using the `connect` static method, a video element could optionally
be passed as an argument to be used to gather metrics as part of the stream switching algorithm.

The `WebRTCStreamManager` defaults to showing live but also allows for updating the playback position
to play streams from archive. The playback position could also be updated; when the position is updated
all `WebRTCStreamManager` instances playback positions are synced to the new time stamp.

## Usage

The `WebRTCStreamManager` class exposes a `connect` static method which is used to initialize a connection.
Optionally it accepts a reference to a video element to automatically close the connection once the player
is no longer on the DOM.

### Example webRtcUrlFactory function:

The `WebRTCStreamManager.connect` method takes as a first argument a function that returns the
webrtc-tracker endpoint with auth.

The camera_id query parameters are required, pos is optional.

Authentication is handled either by cookie authentication before calling `WebRTCStreamManager.connect`
or by providing an digest auth key using the auth query param.

Cookie authentication is recommended because digest auth is disabled for 2fa enabled systems.

```typescript
// Could be a direct connection '{serverIp}:{port}` or a cloud relayed connection '{serverId}.{cloudSystemId}.{relayUrl}'
const serverUrl = 'Server url';
const cameraId = 'Camera id';
const auth = 'Auth key';
const position = 0; // Initial position

const webRtcUrlFactory = () =>
  `wss://${serverUrl}/webrtc-tracker?camera_id=${cameraId}&pos=${position}&auth=${auth}`;
```

### Example usage

The `connect` static method returns an observable emits streams and errors.

To update a video element to use that stream we set the `srcObject` to the stream if it exist.

To start autoplaying you can also set `muted` and `autoplay` to true.


#### Target element

```html
<video id="someTargetId" autoplay muted></video>
```

```typescript
const videoElement = document.querySelector('video#someTargetId')
```

#### Initializing connection and setting video source

```typescript
WebRTCStreamManager.connect(webRtcUrlFactory, videoElement).subscribe(([stream, error]) => {
  if (stream) {
    targetVideoElement.srcObject = stream;
    targetVideoElement.muted = true;
    targetVideoElement.autoplay = true;
  }

  if (error) {
    handleError(error)
  }
});
```
