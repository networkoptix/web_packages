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

Authentication and reconnections are handled automatically by the library for as long as there's an active subscription
to the observable returned by `WebRTCStreamManager.connect`.

## Usage

The `WebRTCStreamManager` class exposes a `connect` static method which is used to initialize a connection.

The `connect` static method could accept either a `WebRtcUrlConfig` or `WebRtcUrlFactory` as the first argument.

Using `WebRtcUrlConfig` is the recommended way to connect since it allows the library to handle more complicated
aspects of establishing a connection like choosing the right authentication method bases on vms version as well
as working with the relay. The `WebRtcUrlFactory` method is deprecated and is only supported for backward compatibility.

### Example webRtcUrlConfig:

The `WebRTCStreamManager.connect` method takes as a first argument a config. The systemId, cameraId, and system access
token are required. Other properties are optional.

```typescript
const webRtcConfig = {
  systemId: '{system_id}',
  cameraId: '{camera_id}',
  accessToken: '{access_token}'
}
```

### Example usage

The `connect` static methods returns an observable emits streams and errors.

To update a video element to use that stream we set the `srcObject` to the stream if it exist.

To start autoplaying you can also set `muted` and `autoplay` to true.


#### Target element

```html
<video id="someTargetId" autoplay muted></video>
```

```typescript
const targetVideoElement = document.querySelector('video#someTargetId')
```

#### Initializing connection and setting video source

```typescript
const connectionSubscription = WebRTCStreamManager.connect(webRtcConfig, videoElement).subscribe(([stream, error]) => {
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

#### Closing the connection

The connection could either be closed manually by unsubscribing from the subscription returned by
`WebRtcStreamManager.connect(...).subscribe(...)` or by using rxjs operators like `takeUntil`.

##### Manually unsubscribing
```typescript
connectionSubscription.unsubscribe();
```

##### Using rxjs `takeUntil`
```typescript
const notifier$ = new Subject();

WebRTCStreamManager.connect(webRtcConfig).pipe(
  takeUntil(notifier$)
).subscribe(handleStream);

// Somewhere else in the code
notifier$.next();
```

