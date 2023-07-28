![Nx Meta Logo](https://meta.nxvms.com/static/images/logo.png)

# WebRTC Stream Manager Example ![License: MPL--2.0"](https://img.shields.io/badge/License-MPL--2.0-yellow.svg)

This a minimal example of how to use the `@networkoptix/webrtc-stream-manager` package to integrate streaming from an Nx Meta VMS server to your own integrations.

For full documentation on the `@networkoptix/webrtc-stream-manager` package [view the readme](../../packages/webrtc-stream-manager/README.md).

---

## How to start the demo

### Install workspace dependencies

Within the root folder run `npm install`. This will install shared workspace dependencies and link local packages.

```sh
npm install
```

### Run demo

Within the `examples/webrtc-stream-manager-example` folder the `npm start` command will start running the demo.

```sh
npm start
```

### Open demo page

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

Enter the `Cloud Instance Url` for the instance with the system you'd like view a WebRTC stream.

Click `Authenticate` to login using oauth.

After oauth redirects back to the demo, the first online system that supports WebRTC and the first online camera
from that system is automatically selected.

If you would like to select a different system or camera the available options will are available on the dropdown.

Click `Start WebRTC Connection` to begin playback.

---

## Demo Source code

The relevant part of the source code related to the `@networkoptix/webrtc-stream-manager` package is in `startStream` function in the [main.ts](./src/main.ts) file.

We pass in the `webRtcUrlFactory` and `videoElement` into the `WebRTCStreamManager.connect` static method.

Then we subscribe to the returned observable and handle the `stream` or `error` that is emitted.

In this demo we're just setting the srcObject to the stream.

```typescript
const startStream = (relayUrl: string, cameraId: string, serverId: string) => {
  const webRtcUrlFactory = () =>
  `wss://${relayUrl}/webrtc-tracker/?camera_id=${cameraId}&x-server-guid=${serverId}`;

WebRTCStreamManager.connect(webRtcUrlFactory, videoElement)
  .pipe(takeUntil(newStream$))
  .subscribe(([stream, error]) => {
    if (stream) {
      videoElement.srcObject = stream;
      videoElement.muted = true;
      videoElement.autoplay = true;
    }
  });
}
```
